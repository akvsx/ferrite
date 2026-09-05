import type { TDatabase } from '@core/database/db.type';
import { warehouses } from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { UpdateWarehouseInput } from '@ferrite/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { WarehouseMapper } from '../../mappers/warehouse.mapper';

export async function executeUpdateWarehouse(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string,
	input: UpdateWarehouseInput
) {
	const [row] = await traceDbOp(
		tracer,
		'db.warehouses.update',
		{ 'db.table': 'warehouses', 'db.operation': 'update' },
		() =>
			db
				.update(warehouses)
				.set({
					...(input.name !== undefined && { name: input.name }),
					...(input.address !== undefined && { address: input.address }),
					...(input.isActive !== undefined && { isActive: input.isActive }),
					updatedAt: sql`now()`,
				})
				.where(
					and(
						eq(warehouses.id, id),
						eq(warehouses.storeId, storeId),
						isNull(warehouses.deletedAt)
					)
				)
				.returning()
	);
	return row ? WarehouseMapper.toDomain(row) : null;
}
