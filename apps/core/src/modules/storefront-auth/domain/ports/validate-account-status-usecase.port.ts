import type { Result } from '@common/interfaces/result.interface';
import type { StorefrontUser } from '@ferrite/schema/storefront-auth/storefront-user.zodschema';
import type { AccountBannedError } from '../errors/account-banned.error';
import type { EmailNotVerifiedError } from '../errors/email-not-verified.error';

export const STOREFRONT_VALIDATE_ACCOUNT_STATUS_UC = Symbol(
	'STOREFRONT_VALIDATE_ACCOUNT_STATUS_UC'
);

export interface ValidateAccountStatusInput {
	user: StorefrontUser;
}

export interface IValidateAccountStatus {
	execute(
		input: ValidateAccountStatusInput
	): Promise<Result<void, EmailNotVerifiedError | AccountBannedError>>;
}
