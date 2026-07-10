import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const SKIP_CSRF = Symbol('SKIP_CSRF');

/**
 * Skip CSRF validation for a route handler or controller.
 * Use this on endpoints that are reachable before a CSRF token is issued
 * (e.g. login, register, verify-email, resend-verification-email).
 */
export const SkipCsrf = (): CustomDecorator<typeof SKIP_CSRF> =>
	SetMetadata(SKIP_CSRF, true);
