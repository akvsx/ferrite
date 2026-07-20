import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type Request,
	type StorefrontAuthenticatedRequest,
} from '@common/types/request';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { extractCookie } from '@libs/http/extractCookie';
import type { IRealmAuthAdapter } from '@modules/auth/domain/ports/realm-auth-adapter.port';
import {
	type IValidateSession,
	STOREFRONT_VALIDATE_SESSION_UC,
} from '@modules/storefront-auth/domain/ports/validate-session-usecase.port';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Storefront realm adapter — validates Redis session cookies for store customers.
 *
 * Extracts the session ID from the cookie and `storeId` from the route params,
 * delegates to `ValidateSessionUseCase` for session validation (including
 * absolute expiry check and sliding-window renewal), and attaches the
 * resulting `StorefrontUser` to the request.
 *
 * This adapter does **not** duplicate any storefront-auth logic — it is a thin
 * infrastructure wrapper that bridges the HTTP layer to the existing use case.
 */
@Injectable()
export class StorefrontRealmAdapter implements IRealmAuthAdapter {
	private readonly cookieName: string;

	constructor(
		@Inject(STOREFRONT_VALIDATE_SESSION_UC)
		private readonly validateSession: IValidateSession,
		private readonly logger: AppLogger,
		config: ConfigService
	) {
		this.logger.setContext(StorefrontRealmAdapter.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.cookieName = ferriteConfig.storefrontAuth.session.cookieName;
	}

	async authenticate(request: Request): Promise<Result<boolean, Error>> {
		const sessionId = extractCookie(request, this.cookieName);
		const storeId = request.params?.storeId;

		if (!sessionId) {
			this.logger.debug('No session cookie provided');
			return err(new Error('No session cookie provided'));
		}

		if (!storeId) {
			this.logger.debug('Storefront routes require a :storeId param');
			return err(new Error('Storefront routes require a :storeId param'));
		}

		const result = await this.validateSession.execute({
			sessionId,
			storeId,
		});

		if (result.isErr()) {
			this.logger.error(
				`Failed to validate storefront session: ${result.error.message}`
			);
			return err(result.error);
		}

		const storefrontRequest = request as StorefrontAuthenticatedRequest;
		storefrontRequest.storefrontUser = result.value;
		storefrontRequest.__authRealm = 'storefront';

		return ok(true);
	}
}
