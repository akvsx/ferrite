import { z } from 'zod/v4';
import { decimalString } from '../shared/decimal-string.zodschema';
import { productStatus, productVariantStatus } from './product.zodschema';

// ─────────────────────────────────────────
// CREATE VARIANT INPUT
// ─────────────────────────────────────────

export const CreateVariantLabelSchema = z.object({
	labelName: z.string().max(100).min(1),
	labelValue: z.string().max(255).min(1),
});

export const CreateVariantImageSchema = z.object({
	url: z.url().max(2048).min(1),
	altText: z.string().max(255).optional(),
	sortOrder: z.number().int().optional(),
});

export const CreateVariantSchema = z.object({
	sku: z.string().max(100).min(1),
	name: z.string().max(255).optional(),
	price: decimalString,
	compareAtPrice: decimalString.optional(),
	costPrice: decimalString.optional(),
	thumbnailUrl: z.url().max(2048).optional(),
	status: productVariantStatus.optional(),
	sortOrder: z.number().int().optional(),
	labels: z.array(CreateVariantLabelSchema).default([]),
	images: z.array(CreateVariantImageSchema).default([]),
});

export type CreateVariant = z.infer<typeof CreateVariantSchema>;

// ─────────────────────────────────────────
// CREATE PRODUCT IMAGE INPUT
// ─────────────────────────────────────────

export const CreateProductImageSchema = z.object({
	url: z.url().max(2048).min(1),
	altText: z.string().max(255).optional(),
	sortOrder: z.number().int().optional(),
});

// ─────────────────────────────────────────
// CREATE PRODUCT INPUT (aggregate)
// ─────────────────────────────────────────

export const CreateProductInputSchema = z.object({
	name: z.string().max(255).min(1),
	slug: z.string().max(255).min(1),
	description: z.string().optional(),
	status: productStatus.optional(),
	supplierId: z.uuid().optional(),
	variants: z.array(CreateVariantSchema).min(1),
	images: z.array(CreateProductImageSchema).default([]),
	categoryIds: z.array(z.uuid()).default([]),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
