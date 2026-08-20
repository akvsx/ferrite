import { z } from 'zod/v4';

export enum EmailTemplate {
	ORGANIZATION_INVITE = 'organization_invite',
	PASSWORD_RESET = 'password_reset',
	WELCOME_ABOARD = 'welcome_aboard',
	STOREFRONT_VERIFY_EMAIL = 'storefront_verify_email',
	STOREFRONT_PASSWORD_RESET = 'storefront_password_reset',
}
export const EmailTransitPayloadSchema = z.object({
	id: z.string(),
	recipient: z.email(),
	template: z.enum(EmailTemplate),
	senderDesignator: z.string().min(1).optional(),
	subject: z.string(),
	payload: z.record(z.string(), z.unknown()),
});

export type EmailTransitPayload = z.infer<typeof EmailTransitPayloadSchema>;
