import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { AdjustStockInput, InventoryLevel } from '@ferrite/schema';
import { ENQUEUE_GRAPHILE_EVENT_UC, type IEnqueue } from '@modules/queue';
import { Inject, Injectable } from '@nestjs/common';
import {
	InsufficientStockError,
	InvalidAdjustmentError,
	InventoryItemNotFoundError,
} from '../../domain/errors';
import { resolveAdjustmentDelta } from '../../domain/helpers/adjustment-sign.helper';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IAdjustStockUseCase } from '../../domain/ports/inventory-use-cases.port';
import { LOW_STOCK_ALERT_QUEUE } from '../../infrastructure/queue/queue.constraints';

@Injectable()
export class AdjustStockUseCase implements IAdjustStockUseCase {
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(ENQUEUE_GRAPHILE_EVENT_UC) private readonly enqueue: IEnqueue,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		data: AdjustStockInput;
	}): Promise<
		Result<
			InventoryLevel,
			| InventoryItemNotFoundError
			| InsufficientStockError
			| InvalidAdjustmentError
		>
	> {
		return this.tracer.withSpan('use-case.inventory.adjust-stock', async () => {
			// Validate quantity sign based on adjustment type
			if (input.data.adjustmentType === 'correction') {
				if (input.data.quantity === 0) {
					return err(
						new InvalidAdjustmentError(
							'Stocktake correction quantity must be non-zero'
						)
					);
				}
			} else if (input.data.quantity < 1) {
				return err(
					new InvalidAdjustmentError(
						`quantity must be >= 1 for ${input.data.adjustmentType} adjustments`
					)
				);
			}

			const delta = resolveAdjustmentDelta(
				input.data.adjustmentType,
				input.data.quantity
			);

			this.logger.debug(
				`Adjusting stock for item ${input.data.inventoryItemId}: ${input.data.adjustmentType} delta=${delta}`
			);

			// Verify item belongs to store
			const item = await this.inventoryItemRepo.findByIdAndStore(
				input.data.inventoryItemId,
				input.storeId
			);
			if (!item) {
				return err(new InventoryItemNotFoundError(input.data.inventoryItemId));
			}

			// Perform atomic update inside UoW
			return this.uow.execute(async (tx) => {
				const updatedLevel = await this.inventoryItemRepo.adjustStock(
					input.data.inventoryItemId,
					{
						type: input.data.adjustmentType,
						quantityChange: delta,
						reason: input.data.reason,
						adjustedBy: input.data.adjustedBy,
					},
					tx
				);

				if (!updatedLevel) {
					return err(
						new InsufficientStockError(
							input.data.inventoryItemId,
							item.level.quantityOnHand,
							delta
						)
					);
				}

				// Emit low-stock alert if threshold breached after a stock decrease
				if (
					delta < 0 &&
					updatedLevel.quantityOnHand <= item.lowStockThreshold &&
					item.lowStockThreshold > 0
				) {
					const enqueueResult = await this.enqueue.execute(tx, {
						identifier: LOW_STOCK_ALERT_QUEUE,
						maxAttempts: 3,
						eventId: crypto.randomUUID(),
						eventType: 'inventory.low-stock',
						payload: {
							inventoryItemId: input.data.inventoryItemId,
							storeId: input.storeId,
							quantityOnHand: updatedLevel.quantityOnHand,
							threshold: item.lowStockThreshold,
						},
					});
					if (enqueueResult.isErr()) {
						throw enqueueResult.error;
					}
				}

				return ok(updatedLevel);
			});
		});
	}
}
