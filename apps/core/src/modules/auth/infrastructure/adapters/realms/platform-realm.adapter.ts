import {
	type IJwtTokenUseCase,
	JWT_TOKEN_UC,
} from '@auth/domain/ports/use-case.port';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type PlatformAuthenticatedRequest,
	type Request,
} from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import type { IRealmAuthAdapter } from '@modules/auth/domain/ports/realm-auth-adapter.port';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Platform realm adapter — verifies Clerk JWTs for store admins.
 *
 * Extracts the Bearer token from the `Authorization` header, delegates to
 * `JwtTokenUseCase` for verification + claim transformation, and attaches
 * the resulting `AuthUser` to the request.
 */
@Injectable()
export class PlatformRealmAdapter implements IRealmAuthAdapter {
	constructor(
		@Inject(JWT_TOKEN_UC) private readonly verifyToken: IJwtTokenUseCase,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(PlatformRealmAdapter.name);
	}

	async authenticate(request: Request): Promise<Result<boolean, Error>> {
		const [type, token] = request.headers?.authorization?.split(' ') ?? [];

		if (type !== 'Bearer' || !token) {
			this.logger.debug('No Bearer token provided');
			return err(new Error('No token provided'));
		}

		const result = await this.verifyToken.execute(token);

		if (result.isErr()) {
			this.logger.error(
				`Failed to verify platform token: ${result.error.message}`
			);
			return err(result.error);
		}

		const platformRequest = request as PlatformAuthenticatedRequest;
		platformRequest.authUser = result.value;
		platformRequest.__authRealm = 'platform';

		return ok(true);
	}
}
