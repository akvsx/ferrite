import { z } from 'zod/v4';

export const verifyEmailSchema = z.object({
	userId: z.uuid(),
	token: z.string().min(1),
});

export type StorefrontVerifyEmail = z.infer<typeof verifyEmailSchema>;
