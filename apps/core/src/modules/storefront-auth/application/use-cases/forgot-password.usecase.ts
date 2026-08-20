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
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitedError } from '../../domain/errors/rate-limited.error';
import type {
	ForgotPasswordError,
	ForgotPasswordInput,
	IStorefrontForgotPassword,
} from '../../domain/ports/forgot-password-usecase.port';
import {
	type IStorefrontPasswordResetRepository,
	STOREFRONT_PASSWORD_RESET_REPOSITORY,
} from '../../domain/ports/password-reset-repository.port';
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
export class ForgotPasswordUseCase implements IStorefrontForgotPassword {
	private readonly resetRateLimitConfig: RateLimitConfig;
	private readonly tokenExpiryTimeMs: number;

	constructor(
		@Inject(STOREFRONT_PASSWORD_RESET_REPOSITORY)
		private readonly resetRepo: IStorefrontPasswordResetRepository,
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
		this.resetRateLimitConfig = {
			key: '',
			...ferriteConfig.storefrontAuth.rateLimiting.passwordReset,
		};
		this.tokenExpiryTimeMs =
			ferriteConfig.storefrontAuth.security.passwordResetTokenTtlMs;
	}

	async execute(
		input: ForgotPasswordInput
	): Promise<Result<void, ForgotPasswordError>> {
		return this.tracer.withSpan('storefront_auth.forgot_password', async () => {
			try {
				// Rate limiting by IP
				await this.rateLimiter.check({
					...this.resetRateLimitConfig,
					key: `rl:password-reset:ip:${input.storeId}`, // Ideally, we pass IP, but let's use storeId for now or email
				});

				// rate limit by email to prevent spamming
				const emailLimit = await this.rateLimiter.check({
					...this.resetRateLimitConfig,
					key: `rl:password-reset:email:${input.storeId}:${input.email.toLowerCase()}`,
				});

				if (!emailLimit.allowed) {
					return err(new RateLimitedError());
				}

				const existingUser = await this.userRepo.findByStoreIdAndEmail(
					input.storeId,
					input.email
				);

				if (!existingUser) {
					// Don't leak user existence
					return ok(undefined);
				}

				// skip for SSO-only accounts
				if (!existingUser.passwordHash) {
					return ok(undefined);
				}

				const rawToken = generateToken();
				const tokenHash = createHash('sha256').update(rawToken).digest('hex');
				const expiresAt = new Date(Date.now() + this.tokenExpiryTimeMs);

				const performWork = async (txn: ITransactionContext) => {
					await this.resetRepo.upsert(
						{
							storeId: input.storeId,
							userId: existingUser.id,
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
						id: `email:storefront-password-reset:${existingUser.id}:${Date.now()}`,
						recipient: input.email,
						template: EmailTemplate.STOREFRONT_PASSWORD_RESET,
						subject: 'Reset your password',
						payload: {
							token: rawToken,
							storeId: input.storeId,
							frontendUrl,
						},
					});

					if (enqueueResult.isErr()) {
						this.logger.error(
							`Failed to enqueue password reset email: ${enqueueResult.error.message}`
						);
						throw enqueueResult.error;
					}
				};

				if (input.tx) {
					await performWork(input.tx);
				} else {
					await this.uow.execute(performWork);
				}

				this.logger.debug(
					`Password reset email enqueued: userId=${existingUser.id} storeId=${input.storeId}`
				);

				return ok(undefined);
			} catch (caught: unknown) {
				const error =
					caught instanceof Error ? caught : new Error(String(caught));
				this.logger.error(`ForgotPasswordUseCase failed: ${error.message}`);
				return err(error);
			}
		});
	}
}
