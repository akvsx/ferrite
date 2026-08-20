import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontUpdatePassword } from '@ferrite/schema/storefront-auth/update-password.zodschema';
import type { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import type { InvalidLoginMethodError } from '../errors/invalid-login-method.error';

export const STOREFRONT_UPDATE_PASSWORD_UC = Symbol(
	'STOREFRONT_UPDATE_PASSWORD_UC'
);

export interface UpdatePasswordInput extends StorefrontUpdatePassword {
	storeId: string;
	userId: string;
	tx?: ITransactionContext;
}

export type UpdatePasswordError =
	| InvalidCredentialsError
	| InvalidLoginMethodError
	| Error;

export type IStorefrontUpdatePassword = IUseCase<
	UpdatePasswordInput,
	void,
	UpdatePasswordError
>;
