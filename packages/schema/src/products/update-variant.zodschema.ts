import { z } from 'zod/v4';
import { CreateVariantSchema } from './create-product.zodschema';

// UPDATE VARIANT INPUT

/**
 * Extends CreateVariantSchema with an optional `id` field.
 * - `id` present  → update existing variant row in place
 * - `id` absent   → match by `sku` if possible, otherwise insert new
 */
export const UpdateVariantSchema = CreateVariantSchema.extend({
	id: z.uuid().optional(),
});

export type UpdateVariant = z.infer<typeof UpdateVariantSchema>;
