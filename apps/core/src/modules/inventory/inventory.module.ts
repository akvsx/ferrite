import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { Module } from '@nestjs/common';
import { INVENTORY_ITEM_REPOSITORY } from './domain/ports/inventory-item.repository.port';
import { DrizzleInventoryItemRepository } from './infrastructure/persistence/repositories/drizzle-inventory-item.repository';

@Module({
	imports: [WarehouseModule],
	providers: [
		{
			provide: INVENTORY_ITEM_REPOSITORY,
			useClass: DrizzleInventoryItemRepository,
		},
	],
	exports: [],
})
export class InventoryModule {}
