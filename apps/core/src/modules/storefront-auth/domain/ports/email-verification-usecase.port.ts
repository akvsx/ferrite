import type { Result } from '@common/interfaces/result.interface';
import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';

export const STOREFRONT_SEND_VERIFICATION_EMAIL_UC = Symbol(
	'STOREFRONT_SEND_VERIFICATION_EMAIL_UC'
);
export const STOREFRONT_RESEND_VERIFICATION_EMAIL_UC = Symbol(
	'STOREFRONT_RESEND_VERIFICATION_EMAIL_UC'
);
export const STOREFRONT_VERIFY_EMAIL_UC = Symbol('STOREFRONT_VERIFY_EMAIL_UC');

import { IncompleteConfigurationError } from '@modules/store';

export interface SendVerificationEmailInput {
	storeId: string;
	userId: string;
	email: string;
	/** Optional pre-existing transaction to enroll in (for atomic registration + email enqueue) */
	tx?: ITransactionContext;
}

export interface ISendVerificationEmail {
	execute(
		input: SendVerificationEmailInput
	): Promise<Result<void, Error | IncompleteConfigurationError>>;
}

import type { StorefrontVerifyEmail } from '@ferrite/schema/storefront-auth/verify-email.zodschema';

export interface VerifyEmailInput extends StorefrontVerifyEmail {
	storeId: string;
}

export interface IVerifyEmail {
	execute(input: VerifyEmailInput): Promise<Result<void, Error>>;
}

export interface ResendVerificationEmailInput {
	storeId: string;
	userId: string;
	email: string;
}

export interface IResendVerificationEmail {
	execute(
		input: ResendVerificationEmailInput
	): Promise<Result<void, Error | IncompleteConfigurationError>>;
}
