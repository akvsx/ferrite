import type { TDatabase } from '@core/database/db.type';
import { warehouses } from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, isNull, or } from 'drizzle-orm';
import { WarehouseMapper } from '../../mappers/warehouse.mapper';

export async function executeFindWarehouseById(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
) {
	const [row] = await traceDbOp(
		tracer,
		'db.warehouses.find_by_id',
		{ 'db.table': 'warehouses', 'db.operation': 'select' },
		() =>
			db
				.select()
				.from(warehouses)
				.where(
					and(
						eq(warehouses.id, id),
						eq(warehouses.storeId, storeId),
						isNull(warehouses.deletedAt)
					)
				)
				.limit(1)
	);
	return row ? WarehouseMapper.toDomain(row) : null;
}

export async function executeFindWarehouseByName(
	tracer: ITracer,
	db: TDatabase,
	name: string,
	storeId: string
) {
	const [row] = await traceDbOp(
		tracer,
		'db.warehouses.find_by_name',
		{ 'db.table': 'warehouses', 'db.operation': 'select' },
		() =>
			db
				.select()
				.from(warehouses)
				.where(
					and(
						eq(warehouses.name, name),
						eq(warehouses.storeId, storeId),
						isNull(warehouses.deletedAt)
					)
				)
				.limit(1)
	);
	return row ? WarehouseMapper.toDomain(row) : null;
}

export async function executeFindWarehouseByIdOrName(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	name: string,
	storeId: string
) {
	const rows = await traceDbOp(
		tracer,
		'db.warehouses.find_by_id_or_name',
		{ 'db.table': 'warehouses', 'db.operation': 'select' },
		() =>
			db
				.select()
				.from(warehouses)
				.where(
					and(
						eq(warehouses.storeId, storeId),
						isNull(warehouses.deletedAt),
						or(eq(warehouses.id, id), eq(warehouses.name, name))
					)
				)
				.limit(2) // We only expect at most 2 (one for ID, one for Name)
	);
	return rows.map(WarehouseMapper.toDomain);
}
