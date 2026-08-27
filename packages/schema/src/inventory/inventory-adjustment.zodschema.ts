import { z } from 'zod/v4';

export const AdjustmentTypeSchema = z.enum([
	'restock',
	'sale',
	'return',
	'damage',
	'adjustment',
	'transfer',
]);

export type AdjustmentType = z.infer<typeof AdjustmentTypeSchema>;

export const AdjustStockInputSchema = z.object({
	inventoryItemId: z.uuid(),
	adjustmentType: AdjustmentTypeSchema,
	quantityChange: z.number().int(),
	reason: z.string().optional(),
	adjustedBy: z.uuid().optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustStockInputSchema>;

export const TransferStockInputSchema = z.object({
	sourceInventoryItemId: z.uuid(),
	destinationInventoryItemId: z.uuid(),
	quantity: z.number().int().min(1),
	reason: z.string().optional(),
	adjustedBy: z.uuid().optional(),
});

export type TransferStockInput = z.infer<typeof TransferStockInputSchema>;
