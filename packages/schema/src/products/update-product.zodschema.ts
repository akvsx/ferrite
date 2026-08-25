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
	variants: z
		.array(UpdateVariantSchema)
		.min(1)
		.superRefine((variants, ctx) => {
			const seenIds = new Set<string>();
			const seenSkus = new Set<string>();

			for (let i = 0; i < variants.length; i++) {
				const variant = variants[i];
				if (!variant) continue;
				if (variant.id) {
					if (seenIds.has(variant.id)) {
						ctx.addIssue({
							code: 'custom',
							message: `Duplicate variant id: ${variant.id}`,
							path: [i, 'id'],
						});
					} else {
						seenIds.add(variant.id);
					}
				}
				if (variant.sku) {
					if (seenSkus.has(variant.sku)) {
						ctx.addIssue({
							code: 'custom',
							message: `Duplicate variant sku: ${variant.sku}`,
							path: [i, 'sku'],
						});
					} else {
						seenSkus.add(variant.sku);
					}
				}
			}
		})
		.optional(),
	images: z.array(CreateProductImageSchema).optional(),
	categoryIds: z.array(z.uuid()).optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
