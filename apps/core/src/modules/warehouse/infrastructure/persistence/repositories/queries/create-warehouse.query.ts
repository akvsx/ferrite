import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { warehouses } from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { CreateWarehouseInput, Warehouse } from '@ferrite/schema';
import { WarehouseMapper } from '../../mappers/warehouse.mapper';

export async function executeCreateWarehouse(
	tracer: ITracer,
	ctx: ITransactionContext,
	storeId: string,
	input: CreateWarehouseInput
): Promise<Warehouse> {
	const executor = DrizzleUnitOfWork.unwrap(ctx);
	const [row] = await traceDbOp(
		tracer,
		'db.warehouses.insert',
		{ 'db.table': 'warehouses', 'db.operation': 'insert' },
		() =>
			executor
				.insert(warehouses)
				.values({
					storeId,
					name: input.name,
					address: input.address,
					isActive: input.isActive,
				})
				.returning()
	);
	return WarehouseMapper.toDomain(row);
}
