import { z } from 'zod/v4';

export const updatePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export type StorefrontUpdatePassword = z.infer<typeof updatePasswordSchema>;
