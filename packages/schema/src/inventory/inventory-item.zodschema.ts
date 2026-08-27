import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';

export const InventoryLevelSchema = z.object({
	inventoryItemId: z.uuid(),
	quantityOnHand: z.number().int().min(0),
	quantityReserved: z.number().int().min(0),
	quantityAvailable: z.number().int().min(0), // Generated/computed field
});

export type InventoryLevel = z.infer<typeof InventoryLevelSchema>;

export const InventoryItemSchema = z.object({
	id: z.uuid(),
	variantId: z.uuid(),
	warehouseId: z.uuid(),
	batchNumber: z.string().nullable().optional(),
	restockDate: z.iso.datetime().nullable().optional(),
	expiryDate: z.iso.datetime().nullable().optional(),
	lowStockThreshold: z.number().int().default(0),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// The aggregate returned by the repository
export const InventoryItemDetailSchema = InventoryItemSchema.extend({
	level: InventoryLevelSchema,
});

export type InventoryItemDetail = z.infer<typeof InventoryItemDetailSchema>;

export const CreateInventoryItemInputSchema = z.object({
	variantId: z.uuid(),
	warehouseId: z.uuid(),
	batchNumber: z.string().optional().nullable(),
	restockDate: z.iso.datetime().optional().nullable(),
	expiryDate: z.iso.datetime().optional().nullable(),
	lowStockThreshold: z.number().int().default(0),
});

export type CreateInventoryItemInput = z.infer<
	typeof CreateInventoryItemInputSchema
>;

export const ListInventoryQuerySchema = PaginationInputSchema.extend({
	search: z.string().optional(),
	variantId: z.uuid().optional(),
});

export type ListInventoryQuery = z.infer<typeof ListInventoryQuerySchema>;
