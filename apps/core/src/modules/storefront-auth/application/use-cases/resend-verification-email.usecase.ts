import { err, type Result } from '@common/interfaces/result.interface';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitedError } from '../../domain/errors/rate-limited.error';
import {
	type IStorefrontEmailVerificationRepository,
	STOREFRONT_EMAIL_VERIFICATION_REPOSITORY,
} from '../../domain/ports/email-verification-repository.port';
import type {
	IResendVerificationEmail,
	ResendVerificationEmailInput,
} from '../../domain/ports/email-verification-usecase.port';
import {
	type ISendVerificationEmail,
	STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
} from '../../domain/ports/email-verification-usecase.port';
import {
	type IRateLimiter,
	RATE_LIMITER,
	type RateLimitConfig,
} from '../../domain/ports/rate-limiter.port';

@Injectable()
export class ResendVerificationEmailUseCase
	implements IResendVerificationEmail
{
	private readonly resendCooldownMs: number;
	private readonly redisRateLimitConfig: RateLimitConfig;

	constructor(
		@Inject(STOREFRONT_EMAIL_VERIFICATION_REPOSITORY)
		private readonly verificationRepo: IStorefrontEmailVerificationRepository,
		@Inject(STOREFRONT_SEND_VERIFICATION_EMAIL_UC)
		private readonly sendVerificationEmail: ISendVerificationEmail,
		@Inject(RATE_LIMITER) private readonly rateLimiter: IRateLimiter,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.resendCooldownMs =
			ferriteConfig.storefrontAuth.rateLimiting.resendCooldownMs;
		this.redisRateLimitConfig = {
			key: '', // set dynamically per request
			...ferriteConfig.storefrontAuth.rateLimiting.verifyEmail,
			// Same cap as SendVerificationEmailUseCase — 1 email per window
			maxAttempts: 1,
		};
	}

	async execute(
		input: ResendVerificationEmailInput
	): Promise<Result<void, Error>> {
		return this.tracer.withSpan(
			'use-case.resend-verification-email',
			async () => {
				try {
					// Redis abuse-protection gate (shared key with SendVerificationEmailUseCase)
					const limit = await this.rateLimiter.check({
						...this.redisRateLimitConfig,
						key: `storefront-auth:send-verification-email:${input.storeId}:${input.userId}`,
					});

					if (!limit.allowed) {
						return err(new RateLimitedError());
					}

					// DB driven rate limit check — provides retryAfterSec for UX.
					const existing = await this.verificationRepo.findMostRecentByUserId(
						input.storeId,
						input.userId
					);

					if (existing) {
						const elapsed = Date.now() - existing.createdAt.getTime();
						if (elapsed < this.resendCooldownMs) {
							const retryAfterSec = Math.ceil(
								(this.resendCooldownMs - elapsed) / 1000
							);
							return err(new RateLimitedError(retryAfterSec));
						}
					}

					// Delegate to the shared use case (generates new token, upserts, enqueues)
					return await this.sendVerificationEmail.execute({
						storeId: input.storeId,
						userId: input.userId,
						email: input.email,
					});
				} catch (caught: unknown) {
					const error =
						caught instanceof Error ? caught : new Error(String(caught));
					this.logger.error(
						`ResendVerificationEmailUseCase failed: ${error.message}`
					);
					return err(error);
				}
			}
		);
	}
}
