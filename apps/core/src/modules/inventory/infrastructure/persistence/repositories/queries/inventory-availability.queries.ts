import type { TDatabase } from '@core/database/db.type';
import {
	inventoryItems,
	inventoryLevels,
	warehouses,
} from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, inArray, sql } from 'drizzle-orm';

export async function executeFindLowStock(
	tracer: ITracer,
	db: TDatabase,
	storeId: string,
	query: { limit?: number; offset?: number; warehouseId?: string }
) {
	const conditions = [
		eq(warehouses.storeId, storeId),
		sql`${inventoryLevels.quantityOnHand} - ${inventoryLevels.quantityReserved} <= ${inventoryItems.lowStockThreshold}`,
	];

	if (query.warehouseId)
		conditions.push(eq(inventoryItems.warehouseId, query.warehouseId));
	const whereClause = and(...conditions);

	// 2 Concurrent requests, since network round trip is not a bottleneck here
	const [data, [{ count }]] = await Promise.all([
		traceDbOp(
			tracer,
			'db.inventory_items.find_low_stock',
			{ 'db.table': 'inventory_items', 'db.operation': 'select' },
			() =>
				db
					.select({
						inventoryItemId: inventoryItems.id,
						variantId: inventoryItems.variantId,
						warehouseId: inventoryItems.warehouseId,
						batchNumber: inventoryItems.batchNumber,
						quantityOnHand: inventoryLevels.quantityOnHand,
						lowStockThreshold: inventoryItems.lowStockThreshold,
					})
					.from(inventoryItems)
					.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
					.innerJoin(
						inventoryLevels,
						eq(inventoryItems.id, inventoryLevels.inventoryItemId)
					)
					.where(whereClause)
					.limit(query.limit ?? 20)
					.offset(query.offset ?? 0)
		),
		traceDbOp(
			tracer,
			'db.inventory_items.count_low_stock',
			{ 'db.table': 'inventory_items', 'db.operation': 'count' },
			() =>
				db
					.select({
						count: sql<number>`cast(count(${inventoryItems.id}) as int)`,
					})
					.from(inventoryItems)
					.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
					.innerJoin(
						inventoryLevels,
						eq(inventoryItems.id, inventoryLevels.inventoryItemId)
					)
					.where(whereClause)
		),
	]);
	return {
		items: data,
		total: count,
		limit: query.limit ?? 20,
		offset: query.offset ?? 0,
	};
}

export async function executeCheckAvailability(
	tracer: ITracer,
	db: TDatabase,
	variantIds: string[],
	storeId: string
) {
	if (variantIds.length === 0) return [];

	const rows = await traceDbOp(
		tracer,
		'db.inventory_items.check_availability',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		() =>
			db
				.select({
					variantId: inventoryItems.variantId,
					available: sql<boolean>`cast(sum(${inventoryLevels.quantityOnHand} - ${inventoryLevels.quantityReserved}) > 0 as boolean)`,
				})
				.from(inventoryItems)
				.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
				.innerJoin(
					inventoryLevels,
					eq(inventoryItems.id, inventoryLevels.inventoryItemId)
				)
				.where(
					and(
						inArray(inventoryItems.variantId, variantIds),
						eq(warehouses.storeId, storeId),
						eq(warehouses.isActive, true)
					)
				)
				.groupBy(inventoryItems.variantId)
	);

	return variantIds.map((id) => ({
		variantId: id,
		available: rows.find((row) => row.variantId === id)?.available ?? false,
	}));
}
