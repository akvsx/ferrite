import { z } from 'zod/v4';

export const UpdateStorefrontUserSchema = z.object({
	displayName: z.string().min(1).max(200).optional(),
});

export type UpdateStorefrontUser = z.infer<typeof UpdateStorefrontUserSchema>;
