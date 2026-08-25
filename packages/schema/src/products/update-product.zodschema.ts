import { z } from 'zod/v4';
import { CreateProductImageSchema } from './create-product.zodschema';
import { productStatus } from './product.zodschema';
import { UpdateVariantSchema } from './update-variant.zodschema';

// UPDATE PRODUCT INPUT

export const UpdateProductInputSchema = z.object({
	// Product fields (all optional for partial update)
	name: z.string().max(255).min(1).optional(),
	slug: z.string().max(255).min(1).optional(),
	description: z.string().nullable().optional(),
	status: productStatus.optional(),
	supplierId: z.uuid().nullable().optional(),

	// Child entities — declarative upsert when provided, untouched when omitted
	// Variants matched by id (preferred) or sku (fallback). Absent = deleted.
	variants: z.array(UpdateVariantSchema).min(1).optional(),
	images: z.array(CreateProductImageSchema).optional(),
	categoryIds: z.array(z.uuid()).optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
