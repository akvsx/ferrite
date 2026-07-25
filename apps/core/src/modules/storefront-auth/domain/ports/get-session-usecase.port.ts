import type { Result } from '@common/interfaces/result.interface';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import type { StorefrontUserResponse } from '@ferrite/schema/storefront-auth/storefront-user.zodschema';

export const STOREFRONT_GET_SESSION_UC = Symbol('IStorefrontGetSession');

export interface GetSessionInput {
	sessionId: string;
	storeId: string;
}

export interface GetSessionResult {
	session: StorefrontSession;
	user: StorefrontUserResponse;
}

export interface IStorefrontGetSession {
	execute(input: GetSessionInput): Promise<Result<GetSessionResult, Error>>;
}
