import { createHash } from 'node:crypto';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { EmailAlreadyVerifiedError } from '@modules/storefront-auth/domain/errors/email-alraedy-vefiried';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitedError } from '../../domain/errors/rate-limited.error';
import {
	type IStorefrontEmailVerificationRepository,
	STOREFRONT_EMAIL_VERIFICATION_REPOSITORY,
} from '../../domain/ports/email-verification-repository.port';
import type {
	IVerifyEmail,
	VerifyEmailInput,
} from '../../domain/ports/email-verification-usecase.port';
import {
	type IRateLimiter,
	RATE_LIMITER,
	type RateLimitConfig,
} from '../../domain/ports/rate-limiter.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

@Injectable()
export class VerifyEmailUseCase implements IVerifyEmail {
	private readonly rateLimitConfig: RateLimitConfig;

	constructor(
		@Inject(STOREFRONT_EMAIL_VERIFICATION_REPOSITORY)
		private readonly verificationRepo: IStorefrontEmailVerificationRepository,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository,
		@Inject(RATE_LIMITER) private readonly rateLimiter: IRateLimiter,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		private readonly logger: AppLogger,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.rateLimitConfig = {
			key: '', //? set dynamically
			...ferriteConfig.storefrontAuth.rateLimiting.verifyEmail,
		};
	}

	async execute(input: VerifyEmailInput): Promise<Result<void, Error>> {
		return this.tracer.withSpan('use-case.verify-email', async () => {
			try {
				// Redis driven rate limiting
				const limit = await this.rateLimiter.check({
					...this.rateLimitConfig,
					key: `storefront-auth:verify-email:${input.userId}`,
				});

				if (!limit.allowed) {
					return err(new RateLimitedError());
				}

				const existingUser = await this.userRepo.findByIdAndStoreId(
					input.userId,
					input.storeId
				);

				if (existingUser?.emailVerifiedAt !== null) {
					return err(new EmailAlreadyVerifiedError());
				}

				const tokenHash = createHash('sha256')
					.update(input.token)
					.digest('hex');

				// Look up the record by hashed token (also checks expiry)
				const verification = await this.verificationRepo.findByUserId(
					input.storeId,
					input.userId,
					tokenHash
				);

				if (!verification) {
					return err(new Error('Invalid or expired verification token'));
				}

				// Atomically: mark email verified + delete the verification record
				await this.uow.execute(async (tx) => {
					await this.userRepo.markEmailVerified(
						verification.userId,
						verification.storeId,
						tx
					);
					await this.verificationRepo.deleteById(verification.id, tx);
				});

				this.logger.debug(
					`Email verified: userId=${verification.userId} storeId=${verification.storeId}`
				);

				return ok();
			} catch (caught: unknown) {
				const error =
					caught instanceof Error ? caught : new Error(String(caught));
				this.logger.error(`VerifyEmailUseCase failed: ${error.message}`);
				return err(error);
			}
		});
	}
}
