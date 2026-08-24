import type { TDatabase } from '@core/database/db.type';
import {
	products,
	productVariants,
} from '@core/database/schema/product.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { and, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';

export async function executeFindExistingSkus(
	tracer: ITracer,
	db: TDatabase,
	skus: string[],
	excludeProductId?: string
): Promise<string[]> {
	if (skus.length === 0) return [];

	return traceDbOp(
		tracer,
		'db.product_variants.findExistingSkus',
		{ 'db.table': 'product_variants', 'db.operation': 'select' },
		async () => {
			const conditions: SQL[] = [
				inArray(productVariants.sku, skus),
				isNull(products.deletedAt),
			];

			if (excludeProductId) {
				conditions.push(
					sql`${productVariants.productId} != ${excludeProductId}`
				);
			}

			const rows = await db
				.select({ sku: productVariants.sku })
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(and(...conditions));

			return rows.map((r) => r.sku);
		}
	);
}
