import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	CreateInventoryItemInput,
	VariantInventorySyncPayload,
} from '@ferrite/schema';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '@modules/warehouse/domain/ports';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { ISyncVariantInventoryUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class SyncVariantInventoryUseCase
	implements ISyncVariantInventoryUseCase
{
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(WAREHOUSE_REPOSITORY)
		private readonly warehouseRepo: IWarehouseRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: VariantInventorySyncPayload
	): Promise<Result<void, Error>> {
		return this.tracer.withSpan(
			'use-case.inventory.sync-variant-inventory',
			async () => {
				this.logger.debug(
					`Syncing inventory for ${input.variantIds.length} variants in store ${input.storeId}`
				);

				const warehouses = await this.warehouseRepo.findActiveByStoreId(
					input.storeId
				);

				if (warehouses.length === 0) {
					this.logger.debug(
						`No active warehouses for store ${input.storeId}, skipping`
					);
					return ok();
				}

				const insertPayloads: CreateInventoryItemInput[] = [];
				for (const variantId of input.variantIds) {
					for (const warehouse of warehouses) {
						insertPayloads.push({
							variantId,
							warehouseId: warehouse.id,
							batchNumber: null,
							lowStockThreshold: 0,
						});
					}
				}

				await this.inventoryItemRepo.bulkCreateIfNotExists(insertPayloads);

				this.logger.debug(
					`Synced ${insertPayloads.length} inventory items (${input.variantIds.length} variants × ${warehouses.length} warehouses)`
				);

				return ok();
			}
		);
	}
}
