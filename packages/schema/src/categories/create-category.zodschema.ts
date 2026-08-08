import { z } from 'zod/v4';

export const CreateCategorySchema = z.object({
	parentId: z.uuid().optional(),
	name: z.string().max(255).min(1),
	slug: z.string().max(255).min(1),
	description: z.string().optional(),
	sortOrder: z.number().int().optional(),
	isActive: z.boolean().optional(),
});

export type CreateCategory = z.infer<typeof CreateCategorySchema>;
