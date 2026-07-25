import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { StorefrontUser } from '@ferrite/schema/storefront-auth/storefront-user.zodschema';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-user-repository.port';
import type {
	IValidateSession,
	ValidateSessionInput,
} from '@modules/storefront-auth/domain/ports/validate-session-usecase.port';
import { Inject, Injectable } from '@nestjs/common';
import { SessionExpiredError } from '../../domain/errors/session-expired.error';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';

@Injectable()
export class ValidateSessionUseCase implements IValidateSession {
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
		input: ValidateSessionInput
	): Promise<
		Result<StorefrontUser, SessionNotFoundError | SessionExpiredError>
	> {
		return this.tracer.withSpan(
			'storefront_auth.session.validate',
			async () => {
				// 1. Lookup session by ID + storeId
				const session = await this.sessionRepo.findByIdAndStoreId(
					input.sessionId,
					input.storeId
				);

				if (!session) {
					return err(new SessionNotFoundError());
				}

				// 2. Check absolute expiry (30-day hard ceiling)
				if (this.sessionRepo.checkAbsoluteExpiry(session)) {
					await this.sessionRepo.deleteById(session.id);
					return err(new SessionExpiredError('absolute'));
				}

				// 3. Sliding-window renewal (extend idle TTL if past threshold)
				await this.sessionRepo.renewIfNeeded(session.id);

				// 4. Lookup the user to return their full profile
				const user = await this.userRepo.findByIdAndStoreId(
					session.userId,
					session.storeId
				);

				if (!user) {
					// User was deleted/banned after session creation — clean up
					await this.sessionRepo.deleteById(session.id);
					return err(new SessionNotFoundError());
				}

				return ok(user);
			}
		);
	}
}
