import { z } from 'zod/v4';

export const CategorySchema = z.object({
	id: z.uuid(),
	storeId: z.uuid(),
	parentId: z.uuid().nullable().optional(),
	name: z.string().max(255),
	slug: z.string().max(255),
	description: z.string().nullable().optional(),
	sortOrder: z.number().int(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type Category = z.infer<typeof CategorySchema>;
