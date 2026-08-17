import { z } from 'zod/v4';

export const forgotPasswordSchema = z.object({
	email: z.email('Invalid email address'),
});

export type StorefrontForgotPassword = z.infer<typeof forgotPasswordSchema>;
