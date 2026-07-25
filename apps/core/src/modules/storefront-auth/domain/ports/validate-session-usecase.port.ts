import type { Result } from '@common/interfaces/result.interface';
import type { StorefrontUser } from '@ferrite/schema/storefront-auth/storefront-user.zodschema';
import type { SessionExpiredError } from '../errors/session-expired.error';
import type { SessionNotFoundError } from '../errors/session-not-found.error';

export const STOREFRONT_VALIDATE_SESSION_UC = Symbol(
	'STOREFRONT_VALIDATE_SESSION_UC'
);

export interface ValidateSessionInput {
	sessionId: string;
	storeId: string;
}

export interface IValidateSession {
	execute(
		input: ValidateSessionInput
	): Promise<
		Result<StorefrontUser, SessionNotFoundError | SessionExpiredError>
	>;
}
