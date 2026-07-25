import { z } from 'zod/v4';

/**
 * Domain type for a storefront session stored in Redis.
 *
 * Redis key structure:
 *   sf:session:{sessionId}  → Hash of these fields
 *   sf:sessions:{storeId}:{userId} → Set<sessionId>
 */
export const storefrontSessionSchema = z.object({
	/** 40 hex chars generated via crypto.randomBytes(20) — NOT a UUID */
	id: z.string(),
	storeId: z.uuid(),
	userId: z.uuid(),
	ipAddress: z.string(),
	userAgent: z.string(),
	countryCode: z.string().default(''),
	/** ISO timestamp stored as string in Redis */
	createdAt: z.string(),
});

/** Input required to create a new session (id + createdAt are generated) */
export const newStorefrontSessionSchema = storefrontSessionSchema.omit({
	id: true,
	createdAt: true,
});

export type StorefrontSession = z.infer<typeof storefrontSessionSchema>;
export type NewStorefrontSession = z.infer<typeof newStorefrontSessionSchema>;
