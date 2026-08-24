import { isFkViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import {
	type ICreateSession,
	STOREFRONT_CREATE_SESSION_UC,
} from '@modules/storefront-auth/domain/ports/create-session-usecase.port';
import {
	type ISendVerificationEmail,
	STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
} from '@modules/storefront-auth/domain/ports/email-verification-usecase.port';
import type { LoginResult } from '@modules/storefront-auth/domain/ports/login-usecase.port';
import {
	type IStorefrontPasswordHasher,
	STOREFRONT_PASSWORD_HASHER,
} from '@modules/storefront-auth/domain/ports/password-hasher.port';
import { IStorefrontRegisterUser } from '@modules/storefront-auth/domain/ports/register-usecase.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-user-repository.port';
import { StorefrontUserMapper } from '@modules/storefront-auth/infrastructure/persistance/mappers/storefront-user.mapper';
import { Inject, Injectable } from '@nestjs/common';
import { IncompleteConfigurationError } from '@store/domain/errors/incomplete-configuration.error';
import { StoreNotFoundError } from '@store/domain/errors/store-not-found.error';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';

@Injectable()
export class RegisterUserUseCase implements IStorefrontRegisterUser {
	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly repo: IStorefrontUserRepository,
		@Inject(STOREFRONT_PASSWORD_HASHER)
		private readonly hasher: IStorefrontPasswordHasher,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(STOREFRONT_SEND_VERIFICATION_EMAIL_UC)
		private readonly sendVerificationEmail: ISendVerificationEmail,
		@Inject(STOREFRONT_CREATE_SESSION_UC)
		private readonly createSession: ICreateSession
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		fullName: string;
		email: string;
		password: string;
		termsAndConditions: boolean;
		ipAddress: string;
		userAgent: string;
	}): Promise<
		Result<
			LoginResult,
			EmailAlreadyRegisteredError | IncompleteConfigurationError | Error
		>
	> {
		return this.tracer.withSpan('use-case.register-user', async () => {
			try {
				const hashedPassword = await this.hasher.hash(input.password);

				const { user } = await this.uow.execute(async (tx) => {
					const user = await this.repo.create(
						{
							id: crypto.randomUUID(),
							storeId: input.storeId,
							email: input.email,
							displayName: input.fullName,
							passwordHash: hashedPassword,
						},
						tx
					);

					// Enqueue verification email inside the same transaction (outbox pattern)
					const emailResult = await this.sendVerificationEmail.execute({
						storeId: input.storeId,
						userId: user.id,
						email: user.email,
						tx,
					});

					if (emailResult.isErr()) {
						// Throwing inside uow.execute rolls back the whole transaction
						throw emailResult.error;
					}

					return { user };
				});

				// Transaction committed — create the Redis session outside the DB tx.
				// Fresh accounts have no rate-limit / lockout / MFA / failed-login state,
				// so the full login flow is unnecessary.
				const sessionResult = await this.createSession.execute({
					storeId: input.storeId,
					userId: user.id,
					ipAddress: input.ipAddress,
					userAgent: input.userAgent,
				});

				if (sessionResult.isErr()) {
					// User and outbox row are already committed; propagate the session error
					// so the caller can surface it (e.g. SessionLimitExceededError).
					return err(sessionResult.error);
				}

				// Update last login timestamp (fire-and-forget, no tx needed post-commit)
				this.repo
					.updateLastLoginAt(user.id, input.storeId)
					.catch((e) =>
						this.logger.error('Failed to update lastLoginAt', String(e))
					);

				this.logger.debug('User registered and verification email sent');

				return ok({
					session: sessionResult.value,
					user: StorefrontUserMapper.formatResponse(user),
				});
			} catch (error: unknown) {
				if (isFkViolation(error)) {
					return err(new StoreNotFoundError(input.storeId));
				}

				const normalized =
					error instanceof Error ? error : new Error(String(error));
				this.logger.error('Failed to register user', normalized.message);
				if (
					normalized instanceof EmailAlreadyRegisteredError ||
					normalized instanceof IncompleteConfigurationError
				) {
					return err(normalized);
				}
				return err(new Error('Registration failed'));
			}
		});
	}
}
