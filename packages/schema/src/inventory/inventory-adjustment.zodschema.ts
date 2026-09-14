import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';

// ─────────────────────────────────────────
// ADJUSTMENT TYPES
// ─────────────────────────────────────────

/**
 * Manual adjustment types allowed on the admin endpoint.
 * 'sale' and 'transfer' are internal-only (driven by Orders/TransferStock UC).
 */
export const ManualAdjustmentTypeSchema = z.enum([
	'restock',
	'return',
	'damage',
	'correction',
]);
export type ManualAdjustmentType = z.infer<typeof ManualAdjustmentTypeSchema>;

/** Full set of adjustment types stored in the ledger. */
export const AdjustmentTypeSchema = z.enum([
	'restock',
	'sale',
	'return',
	'damage',
	'correction',
	'transfer',
]);
export type AdjustmentType = z.infer<typeof AdjustmentTypeSchema>;

// ─────────────────────────────────────────
// ADJUST STOCK
// ─────────────────────────────────────────

/**
 * Full input schema used internally by the use case.
 *
 * `quantity` semantics depend on `adjustmentType`:
 * - restock/return/damage: always positive (server derives sign)
 * - correction (stocktake): may be negative (positive = found more, negative = found fewer)
 *
 * Validation of quantity sign is enforced in the use case layer, not here,
 * because `createZodDto` requires a plain `ZodObject` (no `.refine()`).
 */
export const AdjustStockInputSchema = z.object({
	inventoryItemId: z.uuid(),
	adjustmentType: ManualAdjustmentTypeSchema,
	quantity: z.number().int(),
	reason: z.string().optional(),
	adjustedBy: z.uuid().optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustStockInputSchema>;

/**
 * Request schema for the admin HTTP endpoint.
 * `adjustedBy` and `inventoryItemId` are injected server-side from auth/path params.
 */
export const AdjustStockRequestSchema = AdjustStockInputSchema.omit({
	adjustedBy: true,
	inventoryItemId: true,
});

// ─────────────────────────────────────────
// TRANSFER STOCK
// ─────────────────────────────────────────

export const TransferStockInputSchema = z.object({
	sourceInventoryItemId: z.uuid(),
	destinationInventoryItemId: z.uuid(),
	quantity: z.number().int().min(1),
	reason: z.string().optional(),
	adjustedBy: z.uuid().optional(),
});

export const TransferStockRequestSchema = TransferStockInputSchema.omit({
	adjustedBy: true,
});

export type TransferStockInput = z.infer<typeof TransferStockInputSchema>;

// ─────────────────────────────────────────
// ADJUSTMENT LOG (LEDGER)
// ─────────────────────────────────────────

export const InventoryAdjustmentSchema = z.object({
	id: z.uuid(),
	inventoryItemId: z.uuid(),
	adjustmentType: AdjustmentTypeSchema,
	quantityChange: z.number().int(),
	reason: z.string().nullable().optional(),
	adjustedBy: z.uuid().nullable().optional(),
	createdAt: z.date(),
});

export type InventoryAdjustment = z.infer<typeof InventoryAdjustmentSchema>;

export const ListInventoryAdjustmentsQuerySchema = PaginationInputSchema.extend(
	{}
);

export type ListInventoryAdjustmentsQuery = z.infer<
	typeof ListInventoryAdjustmentsQuerySchema
>;
