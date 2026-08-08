import type { z } from 'zod/v4';
import { CreateCategorySchema } from './create-category.zodschema';

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
