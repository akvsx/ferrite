import type { Result } from '@common/interfaces/result.interface';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import type { SessionExpiredError } from '../errors/session-expired.error';
import type { SessionNotFoundError } from '../errors/session-not-found.error';

export const STOREFRONT_GET_SESSIONS_UC = Symbol('IStorefrontGetSessions');

export interface GetSessionsInput {
	sessionId: string;
	storeId: string;
}

export interface IStorefrontGetSessions {
	execute(
		input: GetSessionsInput
	): Promise<
		Result<
			StorefrontSession[],
			SessionNotFoundError | SessionExpiredError | Error
		>
	>;
}
