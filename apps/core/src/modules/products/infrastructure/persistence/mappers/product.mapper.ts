import type { productCategories } from '@core/database/schema/category.schema';
import type {
	productImages,
	products,
	productVariants,
	variantImages,
	variantLabels,
} from '@core/database/schema/product.schema';
import {
	type Product,
	type ProductDetail,
	ProductDetailSchema,
	type ProductImage,
	ProductImageSchema,
	ProductSchema,
	type ProductVariant,
	ProductVariantSchema,
	type VariantImage,
	VariantImageSchema,
	type VariantLabel,
	VariantLabelSchema,
} from '@ferrite/schema';

type ProductRow = typeof products.$inferSelect;
type ProductImageRow = typeof productImages.$inferSelect;
type ProductVariantRow = typeof productVariants.$inferSelect;
type VariantLabelRow = typeof variantLabels.$inferSelect;
type VariantImageRow = typeof variantImages.$inferSelect;
type ProductCategoryRow = typeof productCategories.$inferSelect;

export class ProductMapper {
	static toProduct(row: ProductRow): Product {
		return ProductSchema.parse({
			id: row.id,
			storeId: row.storeId,
			supplierId: row.supplierId,
			name: row.name,
			slug: row.slug,
			description: row.description,
			status: row.status,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		});
	}

	static toProductImage(row: ProductImageRow): ProductImage {
		return ProductImageSchema.parse({
			id: row.id,
			productId: row.productId,
			url: row.url,
			altText: row.altText,
			sortOrder: row.sortOrder,
			createdAt: row.createdAt.toISOString(),
		});
	}

	static toVariantLabel(row: VariantLabelRow): VariantLabel {
		return VariantLabelSchema.parse({
			id: row.id,
			variantId: row.variantId,
			labelName: row.labelName,
			labelValue: row.labelValue,
		});
	}

	static toVariantImage(row: VariantImageRow): VariantImage {
		return VariantImageSchema.parse({
			id: row.id,
			variantId: row.variantId,
			url: row.url,
			altText: row.altText,
			sortOrder: row.sortOrder,
			createdAt: row.createdAt.toISOString(),
		});
	}

	static toProductVariant(
		row: ProductVariantRow,
		labels: VariantLabelRow[],
		images: VariantImageRow[]
	): ProductVariant {
		return ProductVariantSchema.parse({
			id: row.id,
			productId: row.productId,
			sku: row.sku,
			name: row.name,
			price: row.price,
			compareAtPrice: row.compareAtPrice,
			costPrice: row.costPrice,
			thumbnailUrl: row.thumbnailUrl,
			status: row.status,
			sortOrder: row.sortOrder,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			labels: labels.map(ProductMapper.toVariantLabel),
			images: images.map(ProductMapper.toVariantImage),
		});
	}

	static toProductDetail(
		row: ProductRow,
		images: ProductImageRow[],
		variants: ProductVariantRow[],
		labelsByVariantId: Map<string, VariantLabelRow[]>,
		imagesByVariantId: Map<string, VariantImageRow[]>,
		categoryRows: ProductCategoryRow[]
	): ProductDetail {
		return ProductDetailSchema.parse({
			...ProductMapper.toProduct(row),
			images: images.map(ProductMapper.toProductImage),
			variants: variants.map((v) =>
				ProductMapper.toProductVariant(
					v,
					labelsByVariantId.get(v.id) ?? [],
					imagesByVariantId.get(v.id) ?? []
				)
			),
			categories: categoryRows.map((c) => ({
				categoryId: c.categoryId,
				assignedAt: c.assignedAt.toISOString(),
			})),
		});
	}
}
