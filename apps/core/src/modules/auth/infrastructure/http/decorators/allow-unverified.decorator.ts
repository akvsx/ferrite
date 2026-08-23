import { type CustomDecorator, SetMetadata } from '@nestjs/common';

export const ALLOW_UNVERIFIED = Symbol('ALLOW_UNVERIFIED');

/**
 * Marks a storefront route as accessible to authenticated users whose
 * email has **not** yet been verified.
 *
 * By default every storefront route rejects unverified users with a 401.
 * Apply this decorator at the handler or controller level to opt out of
 * that check while still requiring a valid session and non-banned status.
 *
 * @example
 * ```ts
 * @AllowUnverified()
 * @Get('profile')
 * getProfile() { ... }
 * ```
 */
export const AllowUnverified = (): CustomDecorator<typeof ALLOW_UNVERIFIED> =>
	SetMetadata(ALLOW_UNVERIFIED, true);
