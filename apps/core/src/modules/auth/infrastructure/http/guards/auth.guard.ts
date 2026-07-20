import {
	type IRealmAuthAdapter,
	REALM_ADAPTER_MAP,
} from '@auth/domain/ports/realm-auth-adapter.port';
import { IS_PUBLIC_ROUTE } from '@common/decorators/public-route.decorator';
import { IS_WEBHOOK_ROUTE } from '@common/decorators/webhook-route.decorator';
import { type Request } from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import {
	AUTH_REALM_KEY,
	type AuthRealm,
} from '@modules/auth/infrastructure/http/decorators/use-realm.decorator';

import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly logger: AppLogger,
		private readonly reflector: Reflector,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(REALM_ADAPTER_MAP)
		private readonly realmAdapters: Map<AuthRealm, IRealmAuthAdapter>
	) {
		this.logger.setContext(AuthGuard.name);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		return this.tracer.withSpan('guards.auth.canActivate', async (span) => {
			this.logger.debug('AuthGuard.canActivate');

			const request: Request = context.switchToHttp().getRequest();

			span.setAttributes({
				'guard.name': 'AuthGuard',
				'http.route': request.routeOptions.url ?? 'unknown',
			});

			// Bypass: @PublicRoute() skips auth entirely
			const isPublic = this.reflector.getAllAndOverride<boolean>(
				IS_PUBLIC_ROUTE,
				[context.getHandler(), context.getClass()]
			);

			if (isPublic) {
				this.logger.debug('Public endpoint, bypassing auth');
				return true;
			}

			// Bypass: @WebhookRoute() has its own auth pipeline (WebhookGuard)
			const isWebhook = this.reflector.getAllAndOverride<boolean>(
				IS_WEBHOOK_ROUTE,
				[context.getHandler(), context.getClass()]
			);

			if (isWebhook) {
				this.logger.debug('Webhook endpoint, bypassing JWT auth');
				return true;
			}

			// Resolve realm from controller/handler metadata, default to 'platform'
			const realm =
				this.reflector.getAllAndOverride<AuthRealm>(AUTH_REALM_KEY, [
					context.getHandler(),
					context.getClass(),
				]) ?? 'platform';

			span.setAttributes({ 'auth.realm': realm });

			const adapter = this.realmAdapters.get(realm);
			if (!adapter) {
				// This should never happen at runtime — RealmDiscoveryService
				// validates adapter registration at boot. Belt-and-suspenders guard.
				throw new InternalServerErrorException(
					`No auth adapter registered for realm "${realm}". ` +
						`This is a configuration error — the app should have ` +
						`crashed at startup via RealmDiscoveryService.`
				);
			}

			// Single code path — adapter handles credential extraction,
			// verification, and request mutation. No realm-specific branching.
			const result = await adapter.authenticate(request);

			if (result.isErr()) {
				this.logger.error(`Auth failed [${realm}]: ${result.error.message}`);
				throw new UnauthorizedException('Authentication failed');
			}

			this.logger.debug(`Request ${request.url} authorized [realm=${realm}]`);
			return true;
		});
	}
}
