import {
	isFkViolation,
	isUniqueViolation,
} from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	CreateInventoryItemInput,
	InventoryItemDetail,
} from '@ferrite/schema';
import { WarehouseNotFoundError } from '@modules/warehouse/domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '@modules/warehouse/domain/ports';
import { Inject, Injectable } from '@nestjs/common';
import {
	DuplicateInventoryItemError,
	VariantNotFoundError,
} from '../../domain/errors';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { ICreateInventoryItemUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class CreateInventoryItemUseCase implements ICreateInventoryItemUseCase {
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(WAREHOUSE_REPOSITORY)
		private readonly warehouseRepo: IWarehouseRepository,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		data: CreateInventoryItemInput;
	}): Promise<
		Result<
			InventoryItemDetail,
			| WarehouseNotFoundError
			| VariantNotFoundError
			| DuplicateInventoryItemError
		>
	> {
		return this.tracer.withSpan('use-case.inventory.create-item', async () => {
			this.logger.debug(
				`Creating inventory item for variant ${input.data.variantId} in warehouse ${input.data.warehouseId}`
			);

			// Validate warehouse exists & belongs to store
			const warehouse = await this.warehouseRepo.findByIdAndStore(
				input.data.warehouseId,
				input.storeId
			);
			if (!warehouse) {
				return err(new WarehouseNotFoundError(input.data.warehouseId));
			}

			// Validate variant exists & belongs to store
			const variantExists = await this.inventoryItemRepo.variantExistsForStore(
				input.data.variantId,
				input.storeId
			);
			if (!variantExists) {
				return err(new VariantNotFoundError(input.data.variantId));
			}

			try {
				const item = await this.uow.execute((tx) =>
					this.inventoryItemRepo.create(input.data, tx)
				);
				return ok(item);
			} catch (error: any) {
				if (isFkViolation(error)) {
					return err(new VariantNotFoundError(input.data.variantId));
				}
				if (isUniqueViolation(error)) {
					return err(
						new DuplicateInventoryItemError(
							input.data.variantId,
							input.data.warehouseId
						)
					);
				}
				throw error;
			}
		});
	}
}
