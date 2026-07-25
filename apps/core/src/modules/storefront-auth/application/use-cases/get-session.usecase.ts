import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { SessionExpiredError } from '@modules/storefront-auth/domain/errors/session-expired.error';
import { SessionNotFoundError } from '@modules/storefront-auth/domain/errors/session-not-found.error';
import {
	type GetSessionInput,
	type GetSessionResult,
	type IStorefrontGetSession,
} from '@modules/storefront-auth/domain/ports/get-session-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-user-repository.port';
import { Inject, Injectable } from '@nestjs/common';
import { StorefrontUserMapper } from '../../infrastructure/persistance/mappers/storefront-user.mapper';

@Injectable()
export class GetSessionUseCase implements IStorefrontGetSession {
	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: GetSessionInput
	): Promise<Result<GetSessionResult, Error>> {
		return this.tracer.withSpan('storefront_auth.session.get', async () => {
			// 1. Lookup session by ID + storeId
			const session = await this.sessionRepo.findByIdAndStoreId(
				input.sessionId,
				input.storeId
			);

			if (!session) {
				return err(new SessionNotFoundError());
			}

			// 2. Check absolute expiry
			if (this.sessionRepo.checkAbsoluteExpiry(session)) {
				await this.sessionRepo.deleteById(session.id);
				return err(new SessionExpiredError('absolute'));
			}

			// 3. Sliding-window renewal
			await this.sessionRepo.renewIfNeeded(session.id);

			// 4. Lookup the user
			const user = await this.userRepo.findByIdAndStoreId(
				session.userId,
				session.storeId
			);

			if (!user) {
				// User was deleted/banned after session creation — clean up
				await this.sessionRepo.deleteById(session.id);
				return err(new SessionNotFoundError());
			}

			return ok({
				session,
				user: StorefrontUserMapper.formatResponse(user),
			});
		});
	}
}
