import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import {
	categories,
	productCategories,
} from '@core/database/schema/category.schema';
import {
	productImages,
	products,
	productVariants,
	variantImages,
	variantLabels,
} from '@core/database/schema/product.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { CreateProductInput, ProductDetail } from '@ferrite/schema';
import { CategoryNotFoundError } from '@modules/categories/domain/errors/category-not-found.error';
import { and, eq, inArray } from 'drizzle-orm';
import { ProductMapper } from '../../mappers/product.mapper';
import { groupBy } from './product-utils';

export async function executeCreateProduct(
	tracer: ITracer,
	ctx: ITransactionContext,
	storeId: string,
	input: CreateProductInput
): Promise<ProductDetail> {
	const executor = DrizzleUnitOfWork.unwrap(ctx);

	// Insert product
	const [productRow] = await traceDbOp(
		tracer,
		'db.products.insert',
		{ 'db.table': 'products', 'db.operation': 'insert' },
		() =>
			executor
				.insert(products)
				.values({
					storeId,
					name: input.name,
					slug: input.slug,
					description: input.description,
					status: input.status,
					supplierId: input.supplierId,
				})
				.returning()
	);

	const productId = productRow.id;

	// Insert product images
	const imageRows =
		input.images.length > 0
			? await traceDbOp(
					tracer,
					'db.product_images.insert',
					{
						'db.table': 'product_images',
						'db.operation': 'insert',
					},
					() =>
						executor
							.insert(productImages)
							.values(
								input.images.map((img, idx) => ({
									productId,
									url: img.url,
									altText: img.altText,
									sortOrder: img.sortOrder ?? idx,
								}))
							)
							.returning()
				)
			: [];

	// Insert variants with labels and images
	const variantRows: (typeof productVariants.$inferSelect)[] = [];
	const allLabelRows: (typeof variantLabels.$inferSelect)[] = [];
	const allVariantImageRows: (typeof variantImages.$inferSelect)[] = [];

	for (const [idx, variant] of input.variants.entries()) {
		const [variantRow] = await traceDbOp(
			tracer,
			'db.product_variants.insert',
			{
				'db.table': 'product_variants',
				'db.operation': 'insert',
			},
			() =>
				executor
					.insert(productVariants)
					.values({
						productId,
						sku: variant.sku,
						name: variant.name,
						price: variant.price,
						compareAtPrice: variant.compareAtPrice,
						costPrice: variant.costPrice,
						thumbnailUrl: variant.thumbnailUrl,
						status: variant.status,
						sortOrder: variant.sortOrder ?? idx,
					})
					.returning()
		);
		variantRows.push(variantRow);

		// Labels
		if (variant.labels.length > 0) {
			const labelRows = await traceDbOp(
				tracer,
				'db.variant_labels.insert',
				{
					'db.table': 'variant_labels',
					'db.operation': 'insert',
				},
				() =>
					executor
						.insert(variantLabels)
						.values(
							variant.labels.map((l) => ({
								variantId: variantRow.id,
								labelName: l.labelName,
								labelValue: l.labelValue,
							}))
						)
						.returning()
			);
			allLabelRows.push(...labelRows);
		}

		// Variant images
		if (variant.images.length > 0) {
			const vImageRows = await traceDbOp(
				tracer,
				'db.variant_images.insert',
				{
					'db.table': 'variant_images',
					'db.operation': 'insert',
				},
				() =>
					executor
						.insert(variantImages)
						.values(
							variant.images.map((img, imgIdx) => ({
								variantId: variantRow.id,
								url: img.url,
								altText: img.altText,
								sortOrder: img.sortOrder ?? imgIdx,
							}))
						)
						.returning()
			);
			allVariantImageRows.push(...vImageRows);
		}
	}

	// Insert category associations
	let categoryRows: (typeof productCategories.$inferSelect)[] = [];

	// dedup
	const uniqueCategoryIds = Array.from(new Set(input.categoryIds));

	if (uniqueCategoryIds.length > 0) {
		const validCategories = await traceDbOp(
			tracer,
			'db.categories.select',
			{
				'db.table': 'categories',
				'db.operation': 'select',
			},
			() =>
				executor
					.select({ id: categories.id })
					.from(categories)
					.where(
						and(
							inArray(categories.id, uniqueCategoryIds),
							eq(categories.storeId, storeId)
						)
					)
		);

		const validCategoryIds = new Set(validCategories.map((c) => c.id));
		const invalidCategoryId = uniqueCategoryIds.find(
			(id) => !validCategoryIds.has(id)
		);

		if (invalidCategoryId) {
			throw new CategoryNotFoundError(invalidCategoryId);
		}

		categoryRows = await traceDbOp(
			tracer,
			'db.product_categories.insert',
			{
				'db.table': 'product_categories',
				'db.operation': 'insert',
			},
			() =>
				executor
					.insert(productCategories)
					.values(
						uniqueCategoryIds.map((catId) => ({
							productId,
							categoryId: catId,
						}))
					)
					.returning()
		);
	}

	// Build aggregate
	const labelsByVariantId = groupBy(allLabelRows, 'variantId');
	const imagesByVariantId = groupBy(allVariantImageRows, 'variantId');

	return ProductMapper.toProductDetail(
		productRow,
		imageRows,
		variantRows,
		labelsByVariantId,
		imagesByVariantId,
		categoryRows
	);
}
