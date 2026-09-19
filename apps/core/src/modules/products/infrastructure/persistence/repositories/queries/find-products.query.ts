import type { TDatabase } from '@core/database/db.type';
import { productCategories } from '@core/database/schema/category.schema';
import {
	productImages,
	products,
	productVariants,
	variantImages,
	variantLabels,
} from '@core/database/schema/product.schema';
import { cursorPaginationClauses } from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type {
	AdminProductDetail,
	GetProductsQuery,
	ProductDetail,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { and, eq, ilike, inArray, isNull, type SQL } from 'drizzle-orm';
import { ProductMapper } from '../../mappers/product.mapper';
import {
	fetchAdminProductDetail,
	fetchProductDetail,
	groupBy,
} from './product-utils';

export async function executeFindByIdAndStore(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
): Promise<ProductDetail | null> {
	return traceDbOp(
		tracer,
		'db.products.findByIdAndStore',
		{ 'db.table': 'products', 'db.operation': 'select' },
		() => fetchProductDetail(db, id, storeId)
	);
}

export async function executeFindAdminByIdAndStore(
	tracer: ITracer,
	db: TDatabase,
	id: string,
	storeId: string
): Promise<AdminProductDetail | null> {
	return traceDbOp(
		tracer,
		'db.products.findAdminByIdAndStore',
		{ 'db.table': 'products', 'db.operation': 'select' },
		() => fetchAdminProductDetail(db, id, storeId)
	);
}

export async function executeFindBySlugAndStore(
	tracer: ITracer,
	db: TDatabase,
	slug: string,
	storeId: string
): Promise<ProductDetail | null> {
	return traceDbOp(
		tracer,
		'db.products.findBySlugAndStore',
		{ 'db.table': 'products', 'db.operation': 'select' },
		async () => {
			const filters: SQL[] = [
				eq(products.slug, slug),
				eq(products.storeId, storeId),
				eq(products.status, 'active'),
				isNull(products.deletedAt),
			];

			const [row] = await db
				.select()
				.from(products)
				.where(and(...filters))
				.limit(1);

			if (!row) return null;
			return fetchProductDetail(db, row.id, storeId);
		}
	);
}

export async function executeFindByStoreId(
	tracer: ITracer,
	db: TDatabase,
	storeId: string,
	query: GetProductsQuery
): Promise<PaginatedResponse<ProductDetail>> {
	return traceDbOp(
		tracer,
		'db.products.findByStoreId',
		{ 'db.table': 'products', 'db.operation': 'select' },
		async () => {
			// Build filters
			const filters: SQL[] = [
				eq(products.storeId, storeId),
				isNull(products.deletedAt),
			];

			if (query.status) {
				filters.push(eq(products.status, query.status));
			}

			if (query.supplierId) {
				filters.push(eq(products.supplierId, query.supplierId));
			}

			if (query.search) {
				filters.push(ilike(products.name, `%${query.search}%`));
			}

			// Category filter via subquery
			if (query.categoryId) {
				// Join with product_categories to filter by category
				const productIdsInCategory = db
					.select({ productId: productCategories.productId })
					.from(productCategories)
					.where(eq(productCategories.categoryId, query.categoryId));

				filters.push(inArray(products.id, productIdsInCategory));
			}

			const { where, orderBy, queryLimit } = cursorPaginationClauses({
				idColumn: products.id,
				sortColumn: products.createdAt,
				cursor: query.cursor,
				limit: query.limit ?? 20,
				filters,
				tenantColumn: products.storeId,
				tenantId: storeId,
			});

			const rows = await db
				.select()
				.from(products)
				.where(where)
				.orderBy(...orderBy)
				.limit(queryLimit);

			// Batch-load child entities for all products in this page
			const limit = query.limit ?? 20;
			const hasMore = rows.length > limit;
			const pageRows = hasMore ? rows.slice(0, -1) : rows;

			if (pageRows.length === 0) {
				return { items: [], nextCursor: undefined };
			}

			const productIds = pageRows.map((r) => r.id);

			const variantIdsSubquery = db
				.select({ id: productVariants.id })
				.from(productVariants)
				.where(inArray(productVariants.productId, productIds));

			// Batch fetch all children concurrently
			const [imgRows, variantRows, catRows, allLabels, allVImages] =
				await Promise.all([
					db
						.select()
						.from(productImages)
						.where(inArray(productImages.productId, productIds)),
					db
						.select()
						.from(productVariants)
						.where(inArray(productVariants.productId, productIds)),
					db
						.select()
						.from(productCategories)
						.where(inArray(productCategories.productId, productIds)),
					db
						.select()
						.from(variantLabels)
						.where(inArray(variantLabels.variantId, variantIdsSubquery)),
					db
						.select()
						.from(variantImages)
						.where(inArray(variantImages.variantId, variantIdsSubquery)),
				]);

			// Group by product/variant
			const imgByProduct = groupBy(imgRows, 'productId');
			const variantsByProduct = groupBy(variantRows, 'productId');
			const labelsByVariant = groupBy(allLabels, 'variantId');
			const vImgsByVariant = groupBy(allVImages, 'variantId');
			const catsByProduct = groupBy(catRows, 'productId');

			const items = pageRows.map((row) =>
				ProductMapper.toProductDetail(
					row,
					imgByProduct.get(row.id) ?? [],
					variantsByProduct.get(row.id) ?? [],
					labelsByVariant,
					vImgsByVariant,
					catsByProduct.get(row.id) ?? []
				)
			);

			let nextCursor: string | undefined;
			if (hasMore) {
				const lastRow = pageRows[pageRows.length - 1];
				nextCursor = Buffer.from(
					JSON.stringify({ id: lastRow.id, sortValue: lastRow.createdAt })
				).toString('base64');
			}

			return {
				items,
				nextCursor,
			};
		}
	);
}
