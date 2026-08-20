import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontForgotPassword } from '@ferrite/schema/storefront-auth/forgot-password.zodschema';
import type { IncompleteConfigurationError } from '@modules/store';
import type { RateLimitedError } from '../errors/rate-limited.error';

export const STOREFRONT_FORGOT_PASSWORD_UC = Symbol(
	'STOREFRONT_FORGOT_PASSWORD_UC'
);

export interface ForgotPasswordInput extends StorefrontForgotPassword {
	storeId: string;
	tx?: ITransactionContext;
}

export type ForgotPasswordError =
	| RateLimitedError
	| IncompleteConfigurationError
	| Error;

export type IStorefrontForgotPassword = IUseCase<
	ForgotPasswordInput,
	void,
	ForgotPasswordError
>;
