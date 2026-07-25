import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	IStorefrontLogout,
	LogoutInput,
} from '@modules/storefront-auth/domain/ports/logout-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class LogoutUseCase implements IStorefrontLogout {
	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: LogoutInput): Promise<Result<void, Error>> {
		return this.tracer.withSpan('storefront_auth.logout', async () => {
			await this.sessionRepo.deleteById(input.sessionId);
			this.logger.debug(`Session deleted: sessionId=${input.sessionId}`);
			return ok();
		});
	}
}
