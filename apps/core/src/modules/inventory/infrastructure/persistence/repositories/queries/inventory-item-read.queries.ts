import type { TDatabase } from '@core/database/db.type';
import {
	inventoryItems,
	inventoryLevels,
	warehouses,
} from '@core/database/schema/inventory.schema';
import {
	products,
	productVariants,
} from '@core/database/schema/product.schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { InventoryItemDetail, ListInventoryQuery } from '@ferrite/schema';
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { InventoryItemMapper } from '../../mappers/inventory-item.mapper';

export async function executeVariantExistsForStore(
	tracer: ITracer,
	db: TDatabase,
	variantId: string,
	storeId: string
): Promise<boolean> {
	const [row] = await traceDbOp(
		tracer,
		'db.product_variants.exists_for_store',
		{ 'db.table': 'product_variants', 'db.operation': 'select' },
		() =>
			db
				.select({ id: productVariants.id })
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(
					and(eq(productVariants.id, variantId), eq(products.storeId, storeId))
				)
				.limit(1)
	);
	return !!row;
}

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
	return traceDbOp(
		tracer,
		'db.inventory_items.list_by_warehouse',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		async () => {
			const filters: SQL[] = [eq(inventoryItems.warehouseId, warehouseId)];
			if (query.variantId)
				filters.push(eq(inventoryItems.variantId, query.variantId));
			if (query.search)
				filters.push(
					sql`${inventoryItems.batchNumber} ILIKE ${`%${query.search}%`}`
				);

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
				.select({ item: inventoryItems, level: inventoryLevels })
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
				(row) => InventoryItemMapper.toDomainDetail(row.item, row.level),
				(row) => ({ id: row.item.id, sortValue: row.item.createdAt })
			);
		}
	);
}

export async function executeListInventoryByVariant(
	tracer: ITracer,
	db: TDatabase,
	variantId: string,
	storeId: string,
	query: ListInventoryQuery
) {
	return traceDbOp(
		tracer,
		'db.inventory_items.list_by_variant_paginated',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		async () => {
			const filters: SQL[] = [eq(inventoryItems.variantId, variantId)];
			if (query.search)
				filters.push(
					sql`${inventoryItems.batchNumber} ILIKE ${`%${query.search}%`}`
				);

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
				.select({ item: inventoryItems, level: inventoryLevels })
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
				(row) => InventoryItemMapper.toDomainDetail(row.item, row.level),
				(row) => ({ id: row.item.id, sortValue: row.item.createdAt })
			);
		}
	);
}

export async function executeListInventoryByVariants(
	tracer: ITracer,
	db: TDatabase,
	variantIds: string[],
	storeId: string
): Promise<Record<string, InventoryItemDetail[]>> {
	if (variantIds.length === 0) return {};

	const rows = await traceDbOp(
		tracer,
		'db.inventory_items.list_by_variants',
		{ 'db.table': 'inventory_items', 'db.operation': 'select' },
		() => {
			return db
				.select({ item: inventoryItems, level: inventoryLevels })
				.from(inventoryItems)
				.innerJoin(warehouses, eq(inventoryItems.warehouseId, warehouses.id))
				.innerJoin(
					inventoryLevels,
					eq(inventoryItems.id, inventoryLevels.inventoryItemId)
				)
				.where(
					and(
						inArray(inventoryItems.variantId, variantIds),
						eq(warehouses.storeId, storeId)
					)
				);
		}
	);

	const result: Record<string, InventoryItemDetail[]> = {};
	for (const id of variantIds) {
		result[id] = [];
	}

	for (const row of rows) {
		const detail = InventoryItemMapper.toDomainDetail(row.item, row.level);
		if (!result[detail.variantId]) {
			result[detail.variantId] = [];
		}
		result[detail.variantId].push(detail);
	}

	return result;
}
