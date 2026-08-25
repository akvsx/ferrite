import type { TDatabase } from '@core/database/db.type';
import {
	products,
	productVariants,
} from '@core/database/schema/product.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { eq, sql } from 'drizzle-orm';
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
			return db.transaction(async (tx) => {
				const timestamp = Date.now().toString();
				const [row] = await tx
					.update(products)
					.set({
						deletedAt: new Date(),
						status: 'archived',
						slug: sql`concat(${products.slug}, '.archive.', ${timestamp})`,
					})
					.where(storeFilter(id, storeId))
					.returning({ id: products.id });

				if (row) {
					await tx
						.update(productVariants)
						.set({
							sku: sql`concat(${productVariants.sku}, '.archive.', ${timestamp})`,
						})
						.where(eq(productVariants.productId, row.id));
					return true;
				}
				return false;
			});
		}
	);
}
