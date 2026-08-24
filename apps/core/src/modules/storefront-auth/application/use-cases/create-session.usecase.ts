import { err, ok, type Result } from '@common/interfaces/result.interface';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import { SessionLimitExceededError } from '@modules/storefront-auth/domain/errors/session-limit-exceeded.error';
import type {
	CreateSessionInput,
	ICreateSession,
} from '@modules/storefront-auth/domain/ports/create-session-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CreateSessionUseCase implements ICreateSession {
	private readonly sessionLimit: number;

	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository,
		private readonly logger: AppLogger,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.sessionLimit = ferriteConfig.storefrontAuth.session.sessionLimit;
	}

	async execute(
		input: CreateSessionInput
	): Promise<Result<StorefrontSession, SessionLimitExceededError>> {
		return this.tracer.withSpan(
			'use-case.storefront-auth.create-session',
			async () => {
				this.logger.debug(`Creating session for userId=${input.userId}`);

				const session = await this.sessionRepo.createIfBelowLimit(
					{
						storeId: input.storeId,
						userId: input.userId,
						ipAddress: input.ipAddress,
						userAgent: input.userAgent,
						countryCode: '',
					},
					this.sessionLimit
				);

				if (session === null) {
					return err(new SessionLimitExceededError());
				}

				this.logger.debug(
					`Session created: sessionId=${session.id}, userId=${input.userId}`
				);
				return ok(session);
			}
		);
	}
}
