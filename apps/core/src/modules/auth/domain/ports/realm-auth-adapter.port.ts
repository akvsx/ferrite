import { Result } from '@common/interfaces/result.interface';
import type { Request } from '@common/types/request';

export const REALM_ADAPTER_MAP = Symbol('REALM_ADAPTER_MAP');

/**
 * Common shape for realm-specific authentication adapters.
 *
 * Each adapter encapsulates:
 *  - How to extract credentials from the request (Bearer token vs session cookie)
 *  - How to verify those credentials (Clerk JWT vs Redis session)
 *  - How to attach the authenticated identity to the request
 *
 * The `AuthGuard` dynamically swaps the adapter per-request based on
 * `@UseRealm()` metadata. All downstream guard logic is identical —
 * zero realm-specific branching.
 *
 * Implemented by: `PlatformRealmAdapter`, `StorefrontRealmAdapter`
 */
export interface IRealmAuthAdapter {
	/**
	 * Authenticate the incoming request.
	 *
	 * On success: mutates the request to attach the authenticated identity
	 * (`authUser` or `storefrontUser`) and sets `__authRealm`. Returns `Ok(true)`.
	 *
	 * On failure: returns `Err` with the authentication error.
	 * The guard translates this to an `UnauthorizedException`.
	 */
	authenticate(request: Request): Promise<Result<boolean, Error>>;
}
