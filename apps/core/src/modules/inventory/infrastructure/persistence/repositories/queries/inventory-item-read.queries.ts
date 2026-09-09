import type { TDatabase } from '@core/database/db.type';
import {
	inventoryItems,
	inventoryLevels,
	warehouses,
} from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { ListInventoryQuery } from '@ferrite/schema';
import { and, eq, sql } from 'drizzle-orm';
import { InventoryItemMapper } from '../../mappers/inventory-item.mapper';

export async function executeFindInventoryItemByIdAndStore(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
) {
	const [row] = await traceDbOp(
		tracer,
		'db.inventory_items.find_by_id',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		() =>
			db
				.select({ item: inventoryItems, level: inventoryLevels })
				.from(inventoryItems)
				.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
				.innerJoin(
					inventoryLevels,
					eq(inventoryItems.id, inventoryLevels.inventoryItemId)
				)
				.where(and(eq(inventoryItems.id, id), eq(warehouses.storeId, storeId)))
				.limit(1)
	);
	if (!row) return null;
	return InventoryItemMapper.toDomainDetail(row.item, row.level);
}

export async function executeListInventoryByWarehouse(
	tracer: ITracer,
	db: TDatabase,
	warehouseId: string,
	storeId: string,
	query: ListInventoryQuery
) {
	const conditions = [
		eq(inventoryItems.warehouseId, warehouseId),
		eq(warehouses.storeId, storeId),
	];
	if (query.variantId)
		conditions.push(eq(inventoryItems.variantId, query.variantId));
	if (query.search)
		conditions.push(
			sql`${inventoryItems.batchNumber} ILIKE ${`%${query.search}%`}`
		);
	const whereClause = and(...conditions);
	const [data, [{ count }]] = await Promise.all([
		traceDbOp(
			tracer,
			'db.inventory_items.list_by_warehouse',
			{ 'db.table': 'inventory_items', 'db.operation': 'select' },
			() =>
				db
					.select({ item: inventoryItems, level: inventoryLevels })
					.from(inventoryItems)
					.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
					.innerJoin(
						inventoryLevels,
						eq(inventoryItems.id, inventoryLevels.inventoryItemId)
					)
					.where(whereClause)
					.limit(query.limit ?? 20)
		),
		traceDbOp(
			tracer,
			'db.inventory_items.count_by_warehouse',
			{ 'db.table': 'inventory_items', 'db.operation': 'count' },
			() =>
				db
					.select({
						count: sql<number>`cast(count(${inventoryItems.id}) as int)`,
					})
					.from(inventoryItems)
					.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
					.where(whereClause)
		),
	]);
	return {
		items: data.map((item) =>
			InventoryItemMapper.toDomainDetail(item.item, item.level)
		),
		total: count,
		limit: query.limit ?? 20,
	};
}

export async function executeListInventoryByVariant(
	tracer: ITracer,
	db: TDatabase,
	variantId: string,
	storeId: string
) {
	const rows = await traceDbOp(
		tracer,
		'db.inventory_items.list_by_variant',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		() =>
			db
				.select({ item: inventoryItems, level: inventoryLevels })
				.from(inventoryItems)
				.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
				.innerJoin(
					inventoryLevels,
					eq(inventoryItems.id, inventoryLevels.inventoryItemId)
				)
				.where(
					and(
						eq(inventoryItems.variantId, variantId),
						eq(warehouses.storeId, storeId)
					)
				)
	);
	return rows.map((item) =>
		InventoryItemMapper.toDomainDetail(item.item, item.level)
	);
}
