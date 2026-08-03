import { z } from 'zod/v4';

export const StorefrontUserSchema = z.object({
	id: z.uuid(),
	storeId: z.uuid(),
	email: z.email(),
	emailVerifiedAt: z.date().nullable(),
	mfaEnabled: z.boolean(),
	displayName: z.string().nullable(),
	metadata: z.record(z.string(), z.any()).nullable(),
	lastLoginAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	bannedAt: z.date().nullable(),
});

export type StorefrontUser = z.infer<typeof StorefrontUserSchema>;
