import { z } from 'zod/v4';
import { decimalString } from '../shared/decimal-string.zodschema';

export const productStatus = z.enum(['draft', 'active', 'archived']);
export const productVariantStatus = z.enum([
	'active',
	'inactive',
	'discontinued',
]);

// ─────────────────────────────────────────
// PRODUCT
// ─────────────────────────────────────────

export const ProductSchema = z.object({
	id: z.uuid(),
	storeId: z.uuid(),
	supplierId: z.uuid().nullable().optional(),
	name: z.string().max(255),
	slug: z.string().max(255),
	description: z.string().nullable().optional(),
	status: productStatus,
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

// ─────────────────────────────────────────
// PRODUCT IMAGE
// ─────────────────────────────────────────

export const ProductImageSchema = z.object({
	id: z.uuid(),
	productId: z.uuid(),
	url: z.string().max(2048),
	altText: z.string().max(255).nullable().optional(),
	sortOrder: z.number().int(),
	createdAt: z.iso.datetime(),
});

export type ProductImage = z.infer<typeof ProductImageSchema>;

// ─────────────────────────────────────────
// VARIANT LABEL
// ─────────────────────────────────────────

export const VariantLabelSchema = z.object({
	id: z.uuid(),
	variantId: z.uuid(),
	labelName: z.string().max(100),
	labelValue: z.string().max(255),
});

export type VariantLabel = z.infer<typeof VariantLabelSchema>;

// ─────────────────────────────────────────
// VARIANT IMAGE
// ─────────────────────────────────────────

export const VariantImageSchema = z.object({
	id: z.uuid(),
	variantId: z.uuid(),
	url: z.url().max(2048),
	altText: z.string().max(255).nullable().optional(),
	sortOrder: z.number().int(),
	createdAt: z.iso.datetime(),
});

export type VariantImage = z.infer<typeof VariantImageSchema>;

// ─────────────────────────────────────────
// PRODUCT VARIANT
// ─────────────────────────────────────────

export const ProductVariantSchema = z.object({
	id: z.uuid(),
	productId: z.uuid(),
	sku: z.string().max(100),
	name: z.string().max(255).nullable().optional(),
	price: decimalString,
	compareAtPrice: decimalString.nullable().optional(),
	costPrice: decimalString.nullable().optional(),
	thumbnailUrl: z.url().max(2048).nullable().optional(),
	status: productVariantStatus,
	sortOrder: z.number().int(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
	labels: z.array(VariantLabelSchema).default([]),
	images: z.array(VariantImageSchema).default([]),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// ─────────────────────────────────────────
// PRODUCT DETAIL (aggregate)
// ─────────────────────────────────────────

export const ProductDetailSchema = ProductSchema.extend({
	images: z.array(ProductImageSchema).default([]),
	variants: z.array(ProductVariantSchema).default([]),
	categories: z
		.array(
			z.object({
				categoryId: z.uuid(),
				assignedAt: z.iso.datetime(),
			})
		)
		.default([]),
});

export type ProductDetail = z.infer<typeof ProductDetailSchema>;
