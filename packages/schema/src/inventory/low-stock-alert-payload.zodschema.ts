import { z } from 'zod/v4';

export const lowStockAlertPayloadSchema = z.object({
	inventoryItemId: z.uuid(),
	storeId: z.uuid(),
	quantityOnHand: z.number().int(),
	threshold: z.number().int(),
});

export type LowStockAlertPayload = z.infer<typeof lowStockAlertPayloadSchema>;
