import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';

export const AvailabilityResultSchema = z.object({
	variantId: z.uuid(),
	available: z.boolean(),
});

export type AvailabilityResult = z.infer<typeof AvailabilityResultSchema>;

export const LowStockItemSchema = z.object({
	inventoryItemId: z.uuid(),
	variantId: z.uuid(),
	warehouseId: z.uuid(),
	batchNumber: z.string().nullable().optional(),
	quantityOnHand: z.number().int(),
	lowStockThreshold: z.number().int(),
});

export type LowStockItem = z.infer<typeof LowStockItemSchema>;

export const LowStockQuerySchema = PaginationInputSchema.extend({
	warehouseId: z.uuid().optional(),
});

export type LowStockQuery = z.infer<typeof LowStockQuerySchema>;
