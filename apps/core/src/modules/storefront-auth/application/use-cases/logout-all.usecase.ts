import { err, ok, type Result } from '@common/interfaces/result.interface';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { SessionExpiredError } from '@modules/storefront-auth/domain/errors/session-expired.error';
import { SessionNotFoundError } from '@modules/storefront-auth/domain/errors/session-not-found.error';
import {
	type IStorefrontLogoutAll,
	type LogoutAllInput,
} from '@modules/storefront-auth/domain/ports/logout-all-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LogoutAllUseCase implements IStorefrontLogoutAll {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository
	) {}

	async execute(
		input: LogoutAllInput
	): Promise<Result<void, SessionNotFoundError | SessionExpiredError | Error>> {
		return this.tracer.withSpan(
			'storefront_auth.logout_all',
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

				// 3. Delete all sessions for this user in this store
				await this.sessionRepo.deleteAllByUserId(session.userId, input.storeId);
				return ok(undefined);
			},
			{ 'auth.sessionId': input.sessionId, 'auth.storeId': input.storeId }
		);
	}
}
