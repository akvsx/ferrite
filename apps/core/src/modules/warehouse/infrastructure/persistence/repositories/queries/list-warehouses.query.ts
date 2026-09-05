import type { TDatabase } from '@core/database/db.type';
import { warehouses } from '@core/database/schema/inventory.schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, ilike, isNull, type SQL } from 'drizzle-orm';
import { WarehouseMapper } from '../../mappers/warehouse.mapper';

export async function executeFindActiveWarehouses(
	tracer: ITracer,
	db: TDatabase,
	storeId: string
) {
	const rows = await traceDbOp(
		tracer,
		'db.warehouses.find_active',
		{ 'db.table': 'warehouses', 'db.operation': 'select' },
		() =>
			db
				.select()
				.from(warehouses)
				.where(
					and(
						eq(warehouses.storeId, storeId),
						eq(warehouses.isActive, true),
						isNull(warehouses.deletedAt)
					)
				)
	);
	return rows.map(WarehouseMapper.toDomain);
}

export async function executeFindWarehouses(
	tracer: ITracer,
	db: TDatabase,
	storeId: string,
	query: {
		limit?: number;
		cursor?: string;
		isActive?: boolean;
		search?: string;
	}
) {
	return traceDbOp(
		tracer,
		'db.warehouses.find_all',
		{ 'db.table': 'warehouses', 'db.operation': 'select' },
		async () => {
			const filters: SQL[] = [
				eq(warehouses.storeId, storeId),
				isNull(warehouses.deletedAt),
			];

			if (query.isActive !== undefined) {
				filters.push(eq(warehouses.isActive, query.isActive));
			}
			if (query.search) {
				filters.push(ilike(warehouses.name, `%${query.search}%`));
			}

			const { where, orderBy, queryLimit } = cursorPaginationClauses({
				idColumn: warehouses.id,
				sortColumn: warehouses.createdAt,
				cursor: query.cursor,
				limit: query.limit ?? 20,
				filters,
				tenantColumn: warehouses.storeId,
				tenantId: storeId,
			});

			const rows = await db
				.select()
				.from(warehouses)
				.where(where)
				.orderBy(...orderBy)
				.limit(queryLimit);

			return buildPaginatedResponse(
				rows,
				query.limit ?? 20,
				WarehouseMapper.toDomain,
				(row) => ({ id: row.id, sortValue: row.createdAt })
			);
		}
	);
}
