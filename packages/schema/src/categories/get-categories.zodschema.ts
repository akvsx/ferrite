import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';
import { CategorySchema } from './category.zodschema';

export const GetCategoriesQuerySchema = PaginationInputSchema.extend({
	// We can add category specific filters here later
});

export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuerySchema>;

export const ListCategoriesResponseSchema = z.object({
	items: z.array(CategorySchema),
	nextCursor: z.string().optional(),
});

export type ListCategoriesResponse = z.infer<
	typeof ListCategoriesResponseSchema
>;
