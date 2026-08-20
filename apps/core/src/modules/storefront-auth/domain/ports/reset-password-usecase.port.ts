import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontResetPassword } from '@ferrite/schema/storefront-auth/reset-password.zodschema';
import type { InvalidResetTokenError } from '../errors/invalid-reset-token.error';
import type { RateLimitedError } from '../errors/rate-limited.error';

export const STOREFRONT_RESET_PASSWORD_UC = Symbol(
	'STOREFRONT_RESET_PASSWORD_UC'
);

export interface ResetPasswordInput extends StorefrontResetPassword {
	storeId: string;
	tx?: ITransactionContext;
}

export type ResetPasswordError =
	| InvalidResetTokenError
	| RateLimitedError
	| Error;

export type IStorefrontResetPassword = IUseCase<
	ResetPasswordInput,
	void,
	ResetPasswordError
>;
