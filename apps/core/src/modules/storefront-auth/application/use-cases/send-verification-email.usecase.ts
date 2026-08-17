import { createHash } from 'node:crypto';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type ITransactionContext,
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { EmailTemplate } from '@ferrite/schema/notification/email.zodschema';
import { generateToken } from '@libs/auth/generate-token';
import {
	ENQUEUE_SEND_EMAIL_UC,
	type IEnqueueSendEmail,
} from '@modules/notifications';
import { IncompleteConfigurationError } from '@modules/store';
import {
	GET_STORE_CONFIG_UC,
	type IGetStoreConfigUC,
} from '@modules/store/domain/ports/store-config-usecase.port';
import { EmailAlreadyVerifiedError } from '@modules/storefront-auth/domain/errors/email-alraedy-vefiried';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitedError } from '../../domain/errors/rate-limited.error';
import {
	type IStorefrontEmailVerificationRepository,
	STOREFRONT_EMAIL_VERIFICATION_REPOSITORY,
} from '../../domain/ports/email-verification-repository.port';
import type {
	ISendVerificationEmail,
	SendVerificationEmailInput,
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

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class SendVerificationEmailUseCase implements ISendVerificationEmail {
	private readonly sendRateLimitConfig: RateLimitConfig;

	constructor(
		@Inject(STOREFRONT_EMAIL_VERIFICATION_REPOSITORY)
		private readonly verificationRepo: IStorefrontEmailVerificationRepository,
		@Inject(GET_STORE_CONFIG_UC)
		private readonly getStoreConfigUC: IGetStoreConfigUC,
		@Inject(ENQUEUE_SEND_EMAIL_UC)
		private readonly enqueueEmail: IEnqueueSendEmail,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository,
		@Inject(RATE_LIMITER) private readonly rateLimiter: IRateLimiter,
		private readonly logger: AppLogger,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.sendRateLimitConfig = {
			key: '', // set dynamically per request
			...ferriteConfig.storefrontAuth.rateLimiting.verifyEmail,
			// Hard cap: at most 1 email per window (default 60 s)
			maxAttempts: 1,
			windowMs: 60 * 1000, // 1 minute
		};
	}

	async execute(
		input: SendVerificationEmailInput
	): Promise<Result<void, Error | IncompleteConfigurationError>> {
		return this.tracer.withSpan(
			'use-case.send-verification-email',
			async () => {
				try {
					// Redis rate limit: 1 email per window per user (shared with resend)
					const limit = await this.rateLimiter.check({
						...this.sendRateLimitConfig,
						key: `storefront-auth:send-verification-email:${input.storeId}:${input.userId}`,
					});

					if (!limit.allowed) {
						return err(new RateLimitedError());
					}

					const existingUser = await this.userRepo.findByIdAndStoreId(
						input.userId,
						input.storeId
					);

					if (existingUser && existingUser.emailVerifiedAt !== null) {
						return err(new EmailAlreadyVerifiedError());
					}

					// Generate a cryptographically random token
					const rawToken = generateToken();
					const tokenHash = createHash('sha256').update(rawToken).digest('hex');
					const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
					const verificationId = crypto.randomUUID();

					const performWork = async (txn: ITransactionContext) => {
						// Upsert: wipe old tokens, insert new one — atomically
						await this.verificationRepo.upsert(
							{
								id: verificationId,
								storeId: input.storeId,
								userId: input.userId,
								tokenHash,
								expiresAt,
							},
							txn
						);

						const storeConfigResult = await this.getStoreConfigUC.execute({
							storeId: input.storeId,
						});

						if (storeConfigResult.isErr()) {
							throw new IncompleteConfigurationError(
								'Incomplete store configuration'
							);
						}

						const frontendUrl = storeConfigResult.value.frontendUrl;

						if (!frontendUrl) {
							throw new IncompleteConfigurationError(
								'Incomplete store configuration, Missing front-end url'
							);
						}

						const enqueueResult = await this.enqueueEmail.execute(txn, {
							id: `email:storefront-verify-email:${verificationId}`,
							recipient: input.email,
							template: EmailTemplate.STOREFRONT_VERIFY_EMAIL,
							subject: 'Verify your email address',
							payload: {
								token: rawToken,
								storeId: input.storeId,
								userId: input.userId,
								frontendUrl,
							},
						});

						if (enqueueResult.isErr()) {
							this.logger.error(
								`Failed to enqueue verification email: ${enqueueResult.error.message}`
							);
							throw enqueueResult.error;
						}
					};

					// If an outer transaction is provided (e.g., from registration), join it.
					// Otherwise open a new transaction.
					if (input.tx) {
						await performWork(input.tx);
					} else {
						await this.uow.execute(performWork);
					}

					this.logger.debug(
						`Verification email enqueued: userId=${input.userId} storeId=${input.storeId}`
					);

					return ok();
				} catch (caught: unknown) {
					const error =
						caught instanceof Error ? caught : new Error(String(caught));
					this.logger.error(
						`SendVerificationEmailUseCase failed: ${error.message}`
					);
					return err(error);
				}
			}
		);
	}
}
