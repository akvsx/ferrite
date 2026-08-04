import { z } from 'zod/v4';

export const PaginationInputSchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;

export interface PaginatedResponse<T> {
	items: T[];
	nextCursor?: string;
}
