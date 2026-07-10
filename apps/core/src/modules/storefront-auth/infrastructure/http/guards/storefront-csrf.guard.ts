import type { Request } from '@common/types/request';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { extractCookie } from '@libs/http/extractCookie';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_CSRF } from '../decorators/skip-csrf.decorator';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Double-submit cookie CSRF guard for storefront mutation endpoints.
 *
 * On login the server issues two cookies:
 *   - `__Host-session-token` — HttpOnly, not readable by JS.
 *   - `__Host-csrf-token`    — readable by JS so the client can forward it.
 *
 * For every mutation (`POST / PUT / PATCH / DELETE`) on a `stores/:storeId`
 * route the client must echo the CSRF cookie value back via the `x-csrf-token`
 * request header. The guard compares header ↔ cookie and rejects mismatches.
 *
 * Routes decorated with `@SkipCsrf()` bypass the check entirely — use this on
 * endpoints that are reached before a CSRF token is issued (login, register …).
 */
@Injectable()
export class StorefrontCsrfGuard implements CanActivate {
	private readonly csrfCookieName: string;
	/** Matches /stores/<uuid>/... anywhere in the URL (e.g. after a /v1/ prefix) */
	private static readonly STOREFRONT_PATH_RE = /\/stores\/[0-9a-f-]{36}\//i;

	constructor(
		private readonly logger: AppLogger,
		private readonly reflector: Reflector,
		config: ConfigService
	) {
		this.logger.setContext(StorefrontCsrfGuard.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.csrfCookieName = ferriteConfig.storefrontAuth.csrf.cookieName;
	}

	canActivate(context: ExecutionContext): boolean {
		this.logger.debug('Hit csrf guard');
		const request: Request = context.switchToHttp().getRequest();

		// Only apply to routes under /stores/:storeId
		if (!StorefrontCsrfGuard.STOREFRONT_PATH_RE.test(request.url)) {
			this.logger.debug(`Skipping route ${request.url}`);
			return true;
		}

		// Only guard mutation methods
		if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
			this.logger.debug(`Skipping method ${request.method}`);
			return true;
		}

		// Honour @SkipCsrf() on handler or controller
		const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
			context.getHandler(),
			context.getClass(),
		]);
		if (skip) {
			this.logger.debug(
				`CSRF check skipped for ${request.method} ${request.url}`
			);
			return true;
		}

		const cookieToken = extractCookie(request, this.csrfCookieName);
		const headerToken = request.headers['x-csrf-token'];

		if (
			!cookieToken ||
			!headerToken ||
			typeof headerToken !== 'string' ||
			cookieToken !== headerToken
		) {
			this.logger.warn(
				`CSRF validation failed for ${request.method} ${request.url}`
			);
			throw new ForbiddenException('Invalid or missing CSRF token');
		}

		this.logger.debug(
			`CSRF validation passed for ${request.method} ${request.url}`
		);
		return true;
	}
}
