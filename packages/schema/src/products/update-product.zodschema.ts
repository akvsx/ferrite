import { z } from 'zod/v4';
import {
	CreateProductImageSchema,
	CreateVariantSchema,
} from './create-product.zodschema';
import { productStatus } from './product.zodschema';

// ─────────────────────────────────────────
// UPDATE PRODUCT INPUT
// ─────────────────────────────────────────

export const UpdateProductInputSchema = z.object({
	// Product fields (all optional for partial update)
	name: z.string().max(255).min(1).optional(),
	slug: z.string().max(255).min(1).optional(),
	description: z.string().nullable().optional(),
	status: productStatus.optional(),
	supplierId: z.uuid().nullable().optional(),

	// Child entities — full-replace when provided, untouched when omitted
	variants: z.array(CreateVariantSchema).min(1).optional(),
	images: z.array(CreateProductImageSchema).optional(),
	categoryIds: z.array(z.uuid()).optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
