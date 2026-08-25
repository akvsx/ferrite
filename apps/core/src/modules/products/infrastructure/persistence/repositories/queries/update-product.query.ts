import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { productCategories } from '@core/database/schema/category.schema';
import {
	productImages,
	products,
	productVariants,
	variantImages,
	variantLabels,
} from '@core/database/schema/product.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { ProductDetail, UpdateProductInput } from '@ferrite/schema';
import { eq, inArray } from 'drizzle-orm';
import { fetchProductDetail, storeFilter } from './product-utils';

export async function executeUpdateProduct(
	tracer: ITracer,
	ctx: ITransactionContext,
	id: string,
	storeId: string,
	input: UpdateProductInput
): Promise<ProductDetail | null> {
	const executor = DrizzleUnitOfWork.unwrap(ctx);

	// Update product fields
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
	};
	if (input.name !== undefined) updateData.name = input.name;
	if (input.slug !== undefined) updateData.slug = input.slug;
	if (input.description !== undefined)
		updateData.description = input.description;
	if (input.status !== undefined) updateData.status = input.status;
	if (input.supplierId !== undefined) updateData.supplierId = input.supplierId;

	const [updatedRow] = await traceDbOp(
		tracer,
		'db.products.update',
		{ 'db.table': 'products', 'db.operation': 'update' },
		() =>
			executor
				.update(products)
				.set(updateData)
				.where(storeFilter(id, storeId))
				.returning()
	);

	if (!updatedRow) return null;

	// Replace images if provided
	const images = input.images;
	if (images !== undefined) {
		await traceDbOp(
			tracer,
			'db.product_images.delete',
			{
				'db.table': 'product_images',
				'db.operation': 'delete',
			},
			() =>
				executor.delete(productImages).where(eq(productImages.productId, id))
		);

		if (images.length > 0) {
			await traceDbOp(
				tracer,
				'db.product_images.insert',
				{
					'db.table': 'product_images',
					'db.operation': 'insert',
				},
				() =>
					executor.insert(productImages).values(
						images.map((img, idx) => ({
							productId: id,
							url: img.url,
							altText: img.altText,
							sortOrder: img.sortOrder ?? idx,
						}))
					)
			);
		}
	}

	// Upsert variants if provided (identity-preserving: update/insert/delete)
	if (input.variants !== undefined) {
		// 1. Fetch existing variants for this product
		const existingVariants = await executor
			.select({ id: productVariants.id, sku: productVariants.sku })
			.from(productVariants)
			.where(eq(productVariants.productId, id));

		const existingById = new Map(existingVariants.map((v) => [v.id, v]));
		const existingBySku = new Map(existingVariants.map((v) => [v.sku, v]));

		// 2. Partition input into updates vs inserts
		const toUpdate: {
			existingId: string;
			variant: (typeof input.variants)[number];
			idx: number;
		}[] = [];
		const toInsert: {
			variant: (typeof input.variants)[number];
			idx: number;
		}[] = [];
		const matchedExistingIds = new Set<string>();

		for (const [idx, variant] of input.variants.entries()) {
			let matchedId: string | undefined;

			// Match by id first
			if (variant.id && existingById.has(variant.id)) {
				matchedId = variant.id;
			}
			// Fallback: match by sku
			if (!matchedId) {
				const bySku = existingBySku.get(variant.sku);
				if (bySku) matchedId = bySku.id;
			}

			if (matchedId) {
				matchedExistingIds.add(matchedId);
				toUpdate.push({ existingId: matchedId, variant, idx });
			} else {
				toInsert.push({ variant, idx });
			}
		}

		// 3. Delete variants absent from input (cascade removes inventory_items via FK)
		const removedIds = existingVariants
			.filter((v) => !matchedExistingIds.has(v.id))
			.map((v) => v.id);

		if (removedIds.length > 0) {
			// Delete labels and images first (explicit for clarity, FK cascade would handle it)
			await traceDbOp(
				tracer,
				'db.variant_labels.delete',
				{
					'db.table': 'variant_labels',
					'db.operation': 'delete',
				},
				() =>
					executor
						.delete(variantLabels)
						.where(inArray(variantLabels.variantId, removedIds))
			);
			await traceDbOp(
				tracer,
				'db.variant_images.delete',
				{
					'db.table': 'variant_images',
					'db.operation': 'delete',
				},
				() =>
					executor
						.delete(variantImages)
						.where(inArray(variantImages.variantId, removedIds))
			);
			await traceDbOp(
				tracer,
				'db.product_variants.delete',
				{
					'db.table': 'product_variants',
					'db.operation': 'delete',
				},
				() =>
					executor
						.delete(productVariants)
						.where(inArray(productVariants.id, removedIds))
			);
		}

		// 4. Update existing variants in place
		for (const { existingId, variant, idx } of toUpdate) {
			await traceDbOp(
				tracer,
				'db.product_variants.update',
				{
					'db.table': 'product_variants',
					'db.operation': 'update',
				},
				() =>
					executor
						.update(productVariants)
						.set({
							sku: variant.sku,
							name: variant.name,
							price: variant.price,
							compareAtPrice: variant.compareAtPrice,
							costPrice: variant.costPrice,
							thumbnailUrl: variant.thumbnailUrl,
							status: variant.status,
							sortOrder: variant.sortOrder ?? idx,
							updatedAt: new Date(),
						})
						.where(eq(productVariants.id, existingId))
			);

			// Replace labels (value objects — no external dependents)
			await traceDbOp(
				tracer,
				'db.variant_labels.delete',
				{
					'db.table': 'variant_labels',
					'db.operation': 'delete',
				},
				() =>
					executor
						.delete(variantLabels)
						.where(eq(variantLabels.variantId, existingId))
			);
			if (variant.labels.length > 0) {
				await traceDbOp(
					tracer,
					'db.variant_labels.insert',
					{
						'db.table': 'variant_labels',
						'db.operation': 'insert',
					},
					() =>
						executor.insert(variantLabels).values(
							variant.labels.map((l) => ({
								variantId: existingId,
								labelName: l.labelName,
								labelValue: l.labelValue,
							}))
						)
				);
			}

			// Replace images (value objects — no external dependents)
			await traceDbOp(
				tracer,
				'db.variant_images.delete',
				{
					'db.table': 'variant_images',
					'db.operation': 'delete',
				},
				() =>
					executor
						.delete(variantImages)
						.where(eq(variantImages.variantId, existingId))
			);
			if (variant.images.length > 0) {
				await traceDbOp(
					tracer,
					'db.variant_images.insert',
					{
						'db.table': 'variant_images',
						'db.operation': 'insert',
					},
					() =>
						executor.insert(variantImages).values(
							variant.images.map((img, imgIdx) => ({
								variantId: existingId,
								url: img.url,
								altText: img.altText,
								sortOrder: img.sortOrder ?? imgIdx,
							}))
						)
				);
			}
		}

		// 5. Insert new variants
		for (const { variant, idx } of toInsert) {
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
							productId: id,
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

			if (variant.labels.length > 0) {
				await traceDbOp(
					tracer,
					'db.variant_labels.insert',
					{
						'db.table': 'variant_labels',
						'db.operation': 'insert',
					},
					() =>
						executor.insert(variantLabels).values(
							variant.labels.map((l) => ({
								variantId: variantRow.id,
								labelName: l.labelName,
								labelValue: l.labelValue,
							}))
						)
				);
			}

			if (variant.images.length > 0) {
				await traceDbOp(
					tracer,
					'db.variant_images.insert',
					{
						'db.table': 'variant_images',
						'db.operation': 'insert',
					},
					() =>
						executor.insert(variantImages).values(
							variant.images.map((img, imgIdx) => ({
								variantId: variantRow.id,
								url: img.url,
								altText: img.altText,
								sortOrder: img.sortOrder ?? imgIdx,
							}))
						)
				);
			}
		}
	}

	// Replace categories if provided
	if (input.categoryIds !== undefined) {
		await traceDbOp(
			tracer,
			'db.product_categories.delete',
			{
				'db.table': 'product_categories',
				'db.operation': 'delete',
			},
			() =>
				executor
					.delete(productCategories)
					.where(eq(productCategories.productId, id))
		);

		if (input.categoryIds.length > 0) {
			const categoryIds = input.categoryIds;
			await traceDbOp(
				tracer,
				'db.product_categories.insert',
				{
					'db.table': 'product_categories',
					'db.operation': 'insert',
				},
				() =>
					executor.insert(productCategories).values(
						categoryIds.map((catId) => ({
							productId: id,
							categoryId: catId,
						}))
					)
			);
		}
	}

	// Re-fetch full aggregate
	return fetchProductDetail(executor, id, storeId);
}
