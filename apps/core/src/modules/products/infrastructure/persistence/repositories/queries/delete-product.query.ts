import type { TDatabase } from '@core/database/db.type';
import { products } from '@core/database/schema/product.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { storeFilter } from './product-utils';

export async function executeSoftDelete(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
): Promise<boolean> {
	return traceDbOp(
		tracer,
		'db.products.softDelete',
		{ 'db.table': 'products', 'db.operation': 'update' },
		async () => {
			const [row] = await db
				.update(products)
				.set({ deletedAt: new Date(), status: 'archived' })
				.where(storeFilter(id, storeId))
				.returning({ id: products.id });
			return !!row;
		}
	);
}
