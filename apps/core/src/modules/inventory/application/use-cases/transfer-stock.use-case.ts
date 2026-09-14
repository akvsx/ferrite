import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { InventoryLevel, TransferStockInput } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	InsufficientStockError,
	InvalidTransferError,
	InventoryItemNotFoundError,
} from '../../domain/errors';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { ITransferStockUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class TransferStockUseCase implements ITransferStockUseCase {
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		data: TransferStockInput;
	}): Promise<
		Result<
			{ source: InventoryLevel; destination: InventoryLevel },
			InventoryItemNotFoundError | InsufficientStockError | InvalidTransferError
		>
	> {
		return this.tracer.withSpan(
			'use-case.inventory.transfer-stock',
			async () => {
				const { sourceInventoryItemId, destinationInventoryItemId, quantity } =
					input.data;

				this.logger.debug(
					`Transferring ${quantity} units from ${sourceInventoryItemId} to ${destinationInventoryItemId}`
				);

				// Validate source ≠ destination
				if (sourceInventoryItemId === destinationInventoryItemId) {
					return err(
						new InvalidTransferError(
							'Source and destination cannot be the same item'
						)
					);
				}

				// Find both items & verify store ownership
				const [source, destination] = await Promise.all([
					this.inventoryItemRepo.findByIdAndStore(
						sourceInventoryItemId,
						input.storeId
					),
					this.inventoryItemRepo.findByIdAndStore(
						destinationInventoryItemId,
						input.storeId
					),
				]);

				if (!source) {
					return err(new InventoryItemNotFoundError(sourceInventoryItemId));
				}
				if (!destination) {
					return err(
						new InventoryItemNotFoundError(destinationInventoryItemId)
					);
				}

				if (source.variantId !== destination.variantId) {
					return err(
						new InvalidTransferError(
							'Source and destination must reference the same variant'
						)
					);
				}

				// Atomic transfer in single UoW
				return this.uow.execute(async (tx) => {
					// Decrement source
					const sourceLevel = await this.inventoryItemRepo.adjustStock(
						sourceInventoryItemId,
						{
							type: 'transfer',
							quantityChange: -quantity,
							reason: `Transfer to item ${destinationInventoryItemId}`,
							adjustedBy: input.data.adjustedBy,
						},
						tx
					);

					if (!sourceLevel) {
						return err(
							new InsufficientStockError(
								sourceInventoryItemId,
								source.level.quantityOnHand,
								-quantity
							)
						);
					}

					// Increment destination
					const destLevel = await this.inventoryItemRepo.adjustStock(
						destinationInventoryItemId,
						{
							type: 'transfer',
							quantityChange: quantity,
							reason: `Transfer from item ${sourceInventoryItemId}`,
							adjustedBy: input.data.adjustedBy,
						},
						tx
					);

					if (!destLevel) {
						// Should not happen for positive change, but handle defensively
						throw new Error(
							'Unexpected failure incrementing destination stock'
						);
					}

					return ok({ source: sourceLevel, destination: destLevel });
				});
			}
		);
	}
}
