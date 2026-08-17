import { z } from 'zod/v4';

export const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Token is required'),
	newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type StorefrontResetPassword = z.infer<typeof resetPasswordSchema>;
