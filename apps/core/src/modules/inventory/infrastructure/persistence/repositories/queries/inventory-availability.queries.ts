import type { TDatabase } from '@core/database/db.type';
import {
	inventoryItems,
	inventoryLevels,
	warehouses,
} from '@core/database/schema/inventory.schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';

export async function executeFindLowStock(
	tracer: ITracer,
	db: TDatabase,
	storeId: string,
	query: { limit?: number; cursor?: string; warehouseId?: string }
) {
	return traceDbOp(
		tracer,
		'db.inventory_items.find_low_stock',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		async () => {
			const filters: SQL[] = [
				sql`${inventoryLevels.quantityOnHand} - ${inventoryLevels.quantityReserved} <= ${inventoryItems.lowStockThreshold}`,
			];

			if (query.warehouseId)
				filters.push(eq(inventoryItems.warehouseId, query.warehouseId));

			const { where, orderBy, queryLimit } = cursorPaginationClauses({
				idColumn: inventoryItems.id,
				sortColumn: inventoryItems.createdAt,
				cursor: query.cursor,
				limit: query.limit ?? 20,
				filters,
				tenantColumn: warehouses.storeId,
				tenantId: storeId,
			});

			const rows = await db
				.select({
					inventoryItemId: inventoryItems.id,
					variantId: inventoryItems.variantId,
					warehouseId: inventoryItems.warehouseId,
					batchNumber: inventoryItems.batchNumber,
					quantityOnHand: inventoryLevels.quantityOnHand,
					lowStockThreshold: inventoryItems.lowStockThreshold,
					// Needed for cursor extraction
					_id: inventoryItems.id,
					_createdAt: inventoryItems.createdAt,
				})
				.from(inventoryItems)
				.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
				.innerJoin(
					inventoryLevels,
					eq(inventoryItems.id, inventoryLevels.inventoryItemId)
				)
				.where(where)
				.orderBy(...orderBy)
				.limit(queryLimit);

			return buildPaginatedResponse(
				rows,
				query.limit ?? 20,
				({ _id, _createdAt, ...item }) => item,
				(row) => ({ id: row._id, sortValue: row._createdAt })
			);
		}
	);
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
