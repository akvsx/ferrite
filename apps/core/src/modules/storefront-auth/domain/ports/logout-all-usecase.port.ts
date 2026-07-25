import type { Result } from '@common/interfaces/result.interface';
import type { SessionExpiredError } from '../errors/session-expired.error';
import type { SessionNotFoundError } from '../errors/session-not-found.error';

export const STOREFRONT_LOGOUT_ALL_UC = Symbol('IStorefrontLogoutAll');

export interface LogoutAllInput {
	sessionId: string;
	storeId: string;
}

export interface IStorefrontLogoutAll {
	execute(
		input: LogoutAllInput
	): Promise<Result<void, SessionNotFoundError | SessionExpiredError | Error>>;
}
