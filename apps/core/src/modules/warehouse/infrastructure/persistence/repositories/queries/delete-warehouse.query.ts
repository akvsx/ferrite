import type { TDatabase } from '@core/database/db.type';
import { warehouses } from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, sql } from 'drizzle-orm';

export async function executeSoftDeleteWarehouse(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
) {
	const [row] = await traceDbOp(
		tracer,
		'db.warehouses.soft_delete',
		{ 'db.table': 'warehouses', 'db.operation': 'update' },
		() =>
			db
				.update(warehouses)
				.set({
					isActive: false,
					updatedAt: sql`now()`,
					deletedAt: sql`now()`,
					name: sql`concat(${warehouses.name}, '_deleted_', extract(epoch from now()))`,
				})
				.where(and(eq(warehouses.id, id), eq(warehouses.storeId, storeId)))
				.returning()
	);
	return !!row;
}
