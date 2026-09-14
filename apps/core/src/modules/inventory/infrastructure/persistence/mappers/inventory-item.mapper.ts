import type {
	InventoryItem as DbInventoryItem,
	InventoryLevel as DbInventoryLevel,
	inventoryAdjustments,
} from '@core/database/schema/inventory.schema';
import type { InventoryAdjustment, InventoryItemDetail } from '@ferrite/schema';

export class InventoryItemMapper {
	static toDomainDetail(
		item: DbInventoryItem,
		level: DbInventoryLevel
	): InventoryItemDetail {
		return {
			...item,
			batchNumber: item.batchNumber ?? undefined,
			restockDate: item.restockDate?.toISOString(),
			expiryDate: item.expiryDate?.toISOString(),
			createdAt: item.createdAt.toISOString(),
			updatedAt: item.updatedAt.toISOString(),
			level: {
				...level,
				quantityAvailable: level.quantityAvailable ?? 0,
			},
		};
	}

	static toAdjustmentDomain(
		row: typeof inventoryAdjustments.$inferSelect
	): InventoryAdjustment {
		return {
			...row,
			createdAt: row.createdAt.toISOString(),
			reason: row.reason ?? undefined,
			adjustedBy: row.adjustedBy ?? undefined,
		};
	}
}
