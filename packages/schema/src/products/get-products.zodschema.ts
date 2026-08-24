import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';
import { ProductDetailSchema, productStatus } from './product.zodschema';

// ─────────────────────────────────────────
// QUERY SCHEMA
// ─────────────────────────────────────────

export const GetProductsQuerySchema = PaginationInputSchema.extend({
	// TODO: Upgrade to Postgres tsvector + GIN index for production full-text search
	search: z.string().max(255).optional(),
	categoryId: z.uuid().optional(),
	status: productStatus.optional(),
	supplierId: z.uuid().optional(),
});

export type GetProductsQuery = z.infer<typeof GetProductsQuerySchema>;

// ─────────────────────────────────────────
// PAGINATED RESPONSE
// ─────────────────────────────────────────

export const PaginatedProductResponseSchema = z.object({
	items: z.array(ProductDetailSchema),
	nextCursor: z.string().optional(),
});

export type PaginatedProductResponse = z.infer<
	typeof PaginatedProductResponseSchema
>;
