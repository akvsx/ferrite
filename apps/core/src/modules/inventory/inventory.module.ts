import { ProcessorModule } from '@core/processor';
import { QueueModule } from '@modules/queue';
import { StoreModule } from '@modules/store';
import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { Module } from '@nestjs/common';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock.use-case';
import { CheckAvailabilityUseCase } from './application/use-cases/check-availability.use-case';
import { CreateInventoryItemUseCase } from './application/use-cases/create-inventory-item.use-case';
import { GetInventoryItemUseCase } from './application/use-cases/get-inventory-item.use-case';
import { GetVariantsInventoryUseCase } from './application/use-cases/get-variants-inventory.use-case';
import { ListInventoryAdjustmentsUseCase } from './application/use-cases/list-inventory-adjustments.use-case';
import { ListInventoryItemsUseCase } from './application/use-cases/list-inventory-items.use-case';
import { ListLowStockUseCase } from './application/use-cases/list-low-stock.use-case';
import { SyncVariantInventoryUseCase } from './application/use-cases/sync-variant-inventory.use-case';
import { TransferStockUseCase } from './application/use-cases/transfer-stock.use-case';
import { INVENTORY_ITEM_REPOSITORY } from './domain/ports/inventory-item.repository.port';
import {
	ADJUST_STOCK_UC,
	CHECK_AVAILABILITY_UC,
	CREATE_INVENTORY_ITEM_UC,
	GET_INVENTORY_ITEM_UC,
	GET_VARIANTS_INVENTORY_UC,
	LIST_INVENTORY_ADJUSTMENTS_UC,
	LIST_INVENTORY_ITEMS_UC,
	LIST_LOW_STOCK_UC,
	SYNC_VARIANT_INVENTORY_UC,
	TRANSFER_STOCK_UC,
} from './domain/ports/inventory-use-cases.port';
import { InventoryAdminController } from './infrastructure/http/controllers/inventory.admin.controller';
import { InventoryStorefrontController } from './infrastructure/http/controllers/inventory.storefront.controller';
import { DrizzleInventoryItemRepository } from './infrastructure/persistence/repositories/drizzle-inventory-item.repository';
import { LowStockAlertProcessor } from './infrastructure/queue/low-stock-alert.processor';
import { VariantInventorySyncProcessor } from './infrastructure/queue/variant-inventory-sync.processor';

@Module({
	imports: [WarehouseModule, QueueModule, ProcessorModule, StoreModule],
	controllers: [InventoryAdminController, InventoryStorefrontController],
	providers: [
		// Repository
		{
			provide: INVENTORY_ITEM_REPOSITORY,
			useClass: DrizzleInventoryItemRepository,
		},
		// Use Cases
		{
			provide: CREATE_INVENTORY_ITEM_UC,
			useClass: CreateInventoryItemUseCase,
		},
		{
			provide: GET_INVENTORY_ITEM_UC,
			useClass: GetInventoryItemUseCase,
		},
		{
			provide: LIST_INVENTORY_ITEMS_UC,
			useClass: ListInventoryItemsUseCase,
		},
		{
			provide: ADJUST_STOCK_UC,
			useClass: AdjustStockUseCase,
		},
		{
			provide: TRANSFER_STOCK_UC,
			useClass: TransferStockUseCase,
		},
		{
			provide: LIST_LOW_STOCK_UC,
			useClass: ListLowStockUseCase,
		},
		{
			provide: CHECK_AVAILABILITY_UC,
			useClass: CheckAvailabilityUseCase,
		},
		{
			provide: SYNC_VARIANT_INVENTORY_UC,
			useClass: SyncVariantInventoryUseCase,
		},
		{
			provide: GET_VARIANTS_INVENTORY_UC,
			useClass: GetVariantsInventoryUseCase,
		},
		{
			provide: LIST_INVENTORY_ADJUSTMENTS_UC,
			useClass: ListInventoryAdjustmentsUseCase,
		},
		// Queue Processors
		VariantInventorySyncProcessor,
		LowStockAlertProcessor,
	],
	exports: [GET_VARIANTS_INVENTORY_UC],
})
export class InventoryModule {}
