import { SetMetadata } from '@nestjs/common';

export const AUTH_REALM_KEY = 'AUTH_REALM';

export type AuthRealm = 'platform' | 'storefront';

/**
 * Declares which authentication realm a controller belongs to.
 *
 * Applied at the **controller class** level. Every route inside the controller
 * inherits the same realm. The global `AuthGuard` reads this metadata and
 * dynamically dispatches to the matching realm adapter.
 *
 * - `'platform'` — Clerk JWT (Bearer token) for store admins
 * - `'storefront'` — Redis session (cookie) for store customers
 *
 * Constraints (enforced by `RealmDiscoveryService` at boot):
 * - `@UseRealm('storefront')` must NOT be on an `/admin` path.
 * - `@UseRealm('platform')` on a `stores/:storeId` path MUST include `/admin`.
 *
 * @example
 * ```ts
 * @UseRealm('storefront')
 * @Controller('stores/:storeId/cart')
 * export class StorefrontCartController { ... }
 *
 * @UseRealm('platform')
 * @Controller('stores/:storeId/admin/products')
 * export class AdminProductController { ... }
 * ```
 */
export const UseRealm = (realm: AuthRealm) =>
	SetMetadata(AUTH_REALM_KEY, realm);
