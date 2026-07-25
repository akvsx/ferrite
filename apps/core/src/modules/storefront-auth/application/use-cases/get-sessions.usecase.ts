import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import { SessionExpiredError } from '@modules/storefront-auth/domain/errors/session-expired.error';
import { SessionNotFoundError } from '@modules/storefront-auth/domain/errors/session-not-found.error';
import {
	type GetSessionsInput,
	type IStorefrontGetSessions,
} from '@modules/storefront-auth/domain/ports/get-sessions-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class GetSessionsUseCase implements IStorefrontGetSessions {
	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: GetSessionsInput
	): Promise<
		Result<
			StorefrontSession[],
			SessionNotFoundError | SessionExpiredError | Error
		>
	> {
		return this.tracer.withSpan(
			'storefront_auth.sessions.get_all',
			async () => {
				// 1. Validate the requesting session
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

				// 3. Fetch all active sessions for this user
				const sessions = await this.sessionRepo.findAllByUserIdAndStoreId(
					session.userId,
					input.storeId
				);

				// Filter out any sessions that exceeded absolute expiry but haven't
				// been cleaned up from the set yet.
				const validSessions = sessions.filter(
					(s) => !this.sessionRepo.checkAbsoluteExpiry(s)
				);

				return ok(validSessions);
			},
			{ 'auth.sessionId': input.sessionId, 'auth.storeId': input.storeId }
		);
	}
}
