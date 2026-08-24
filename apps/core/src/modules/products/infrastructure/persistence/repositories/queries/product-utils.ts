import type { TDatabase } from '@core/database/db.type';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { productCategories } from '@core/database/schema/category.schema';
import {
	productImages,
	products,
	productVariants,
	variantImages,
	variantLabels,
} from '@core/database/schema/product.schema';
import type { ProductDetail } from '@ferrite/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { ProductMapper } from '../../mappers/product.mapper';

export function storeFilter(id: string, storeId: string) {
	return and(
		eq(products.id, id),
		eq(products.storeId, storeId),
		isNull(products.deletedAt)
	);
}

export function groupBy<T extends Record<string, any>>(
	rows: T[],
	key: keyof T
): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const row of rows) {
		const k = row[key] as string;
		const arr = map.get(k) ?? [];
		arr.push(row);
		map.set(k, arr);
	}
	return map;
}

export async function fetchProductDetail(
	executor: TDatabase | ReturnType<typeof DrizzleUnitOfWork.unwrap>,
	id: string,
	storeId: string,
	onlyActive?: boolean
): Promise<ProductDetail | null> {
	const filters = [storeFilter(id, storeId)];
	if (onlyActive) {
		filters.push(eq(products.status, 'active'));
	}

	const [row] = await executor
		.select()
		.from(products)
		.where(and(...filters))
		.limit(1);

	if (!row) return null;

	const [imgRows, variantRows, catRows] = await Promise.all([
		executor
			.select()
			.from(productImages)
			.where(eq(productImages.productId, id)),
		executor
			.select()
			.from(productVariants)
			.where(eq(productVariants.productId, id)),
		executor
			.select()
			.from(productCategories)
			.where(eq(productCategories.productId, id)),
	]);

	const variantIds = variantRows.map((v) => v.id);
	const [labelRows, vImgRows] =
		variantIds.length > 0
			? await Promise.all([
					executor
						.select()
						.from(variantLabels)
						.where(inArray(variantLabels.variantId, variantIds)),
					executor
						.select()
						.from(variantImages)
						.where(inArray(variantImages.variantId, variantIds)),
				])
			: [[], []];

	const labelsByVariantId = groupBy(labelRows, 'variantId');
	const imagesByVariantId = groupBy(vImgRows, 'variantId');

	return ProductMapper.toProductDetail(
		row,
		imgRows,
		variantRows,
		labelsByVariantId,
		imagesByVariantId,
		catRows
	);
}
