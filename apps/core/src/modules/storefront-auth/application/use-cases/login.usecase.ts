import { err, ok, type Result } from '@common/interfaces/result.interface';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { InvalidLoginMethodError } from '@modules/storefront-auth/domain/errors/invalid-login-method.error';
import type {
	IStorefrontLoginUser,
	LoginError,
	LoginInput,
	LoginResult,
} from '@modules/storefront-auth/domain/ports/login-usecase.port';
import {
	type IStorefrontPasswordHasher,
	STOREFRONT_PASSWORD_HASHER,
} from '@modules/storefront-auth/domain/ports/password-hasher.port';
import {
	type IRateLimiter,
	RATE_LIMITER,
} from '@modules/storefront-auth/domain/ports/rate-limiter.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-user-repository.port';
import { StorefrontUserMapper } from '@modules/storefront-auth/infrastructure/persistance/mappers/storefront-user.mapper';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountLockedError } from '../../domain/errors/account-locked.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { MfaRequiredError } from '../../domain/errors/mfa-required.error';
import { RateLimitedError } from '../../domain/errors/rate-limited.error';

@Injectable()
export class LoginUseCase implements IStorefrontLoginUser {
	private readonly lockoutThreshold: number;
	private readonly lockoutDurationMs: number;

	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository,
		@Inject(STOREFRONT_PASSWORD_HASHER)
		private readonly hasher: IStorefrontPasswordHasher,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository,
		@Inject(RATE_LIMITER) private readonly rateLimiter: IRateLimiter,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.lockoutThreshold =
			ferriteConfig.storefrontAuth.security.lockoutThreshold;
		this.lockoutDurationMs =
			ferriteConfig.storefrontAuth.security.lockoutDurationMs;
	}

	async execute(input: LoginInput): Promise<Result<LoginResult, LoginError>> {
		return this.tracer.withSpan(
			'storefront_auth.login',
			async () => {
				// 1. Rate limit — per account
				const accountRl = await this.rateLimiter.check({
					key: `rl:login:${input.storeId}:${input.email.toLowerCase()}`,
					windowMs: this.lockoutDurationMs,
					maxAttempts: 5,
				});
				if (!accountRl.allowed) {
					return err(new RateLimitedError());
				}

				// 2. Rate limit — per IP
				const ipRl = await this.rateLimiter.check({
					key: `rl:login:ip:${input.ipAddress}`,
					windowMs: this.lockoutDurationMs,
					maxAttempts: 20,
				});
				if (!ipRl.allowed) {
					return err(new RateLimitedError());
				}

				// 3. Lookup user
				const user = await this.userRepo.findByStoreIdAndEmail(
					input.storeId,
					input.email
				);

				if (!user) {
					// Hash a dummy password to prevent timing attacks
					await this.hasher.hash('dummy-password-for-timing');
					return err(new InvalidCredentialsError());
				}

				// 4. Check account lockout
				if (user.lockedUntil && user.lockedUntil > new Date()) {
					return err(new AccountLockedError(user.lockedUntil));
				}

				// 5. SSO-only account (no password set) — cannot login with password
				if (!user.passwordHash) {
					return err(new InvalidLoginMethodError());
				}

				// 6. Verify password
				const passwordValid = await this.hasher.isValid(
					input.password,
					user.passwordHash
				);

				if (!passwordValid) {
					// Increment failed login counter
					await this.userRepo.incrementFailedLogins(user.id, input.storeId);

					// Check if lockout threshold is reached
					const newFailedCount = user.failedLoginCount + 1; // adding current attempt
					if (newFailedCount >= this.lockoutThreshold) {
						const lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
						await this.userRepo.updateLockedUntil(
							user.id,
							input.storeId,
							lockedUntil
						);
						this.logger.warn(
							`Account locked: userId=${user.id}, until=${lockedUntil.toISOString()}`
						);
					}

					return err(new InvalidCredentialsError());
				}

				// 7. Check MFA requirement
				if (user.mfaEnabled) {
					// TODO: Generate a short-lived MFA challenge token
					return err(new MfaRequiredError('mfa-challenge-placeholder'));
				}

				// 8. Reset failed login count on successful auth
				if (user.failedLoginCount > 0) {
					await this.userRepo.resetFailedLogins(user.id, input.storeId);
				}

				// 9. Create Redis session
				const session = await this.sessionRepo.create({
					storeId: input.storeId,
					userId: user.id,
					ipAddress: input.ipAddress,
					userAgent: input.userAgent,
					countryCode: '',
				});

				// 10. Clear rate limiter attempts on successful login
				await Promise.all([
					this.rateLimiter.reset(
						`rl:login:${input.storeId}:${input.email.toLowerCase()}`
					),
					this.rateLimiter.reset(`rl:login:ip:${input.ipAddress}`),
				]).catch((e) =>
					this.logger.error('Failed to reset rate limits', String(e))
				);

				// 11. Update last login timestamp (fire-and-forget, don't block the response)
				this.userRepo
					.updateLastLoginAt(user.id, input.storeId)
					.catch((e) =>
						this.logger.error('Failed to update lastLoginAt', String(e))
					);

				this.logger.debug(
					`Login successful: userId=${user.id}, sessionId=${session.id}`
				);

				return ok({
					session,
					user: StorefrontUserMapper.formatResponse(user),
				});
			},
			{ 'auth.method': 'password' }
		);
	}
}
