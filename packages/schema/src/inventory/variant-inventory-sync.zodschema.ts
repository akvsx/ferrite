import { z } from 'zod/v4';

export const VariantInventorySyncPayloadSchema = z.object({
	storeId: z.uuid(),
	variantIds: z.array(z.uuid()),
});

export type VariantInventorySyncPayload = z.infer<
	typeof VariantInventorySyncPayloadSchema
>;
