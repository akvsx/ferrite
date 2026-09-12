import { z } from 'zod/v4';
import { authProvidersSchema } from './auth-providers.zodschema';
import { publicMetadataSchema } from './public-metadata.zodschema';

const platformUserSchema = z.object({
	id: z.uuid(),
	externalAuthId: z.string(),
	provider: authProvidersSchema,
	email: z.string(),
	emailVerified: z.boolean(),
	fullName: z.string().optional(),
	role: z.string().optional(),
	metadata: publicMetadataSchema,
});

type PlatformUser = z.infer<typeof platformUserSchema>;

export {
	/**
	 * @deprecated Use `PlatformUser` instead.
	 */
	type PlatformUser as AuthUser,
	type PlatformUser,
	/**
	 * @deprecated Use `platformUserSchema` instead.
	 */
	platformUserSchema as authUserSchema,
	platformUserSchema,
};
