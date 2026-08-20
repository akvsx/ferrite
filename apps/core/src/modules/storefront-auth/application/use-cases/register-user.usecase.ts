import { isFkViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import {
	type ISendVerificationEmail,
	STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
} from '@modules/storefront-auth/domain/ports/email-verification-usecase.port';
import {
	type IStorefrontLoginUser,
	type LoginResult,
	STOREFRONT_LOGIN_UC,
} from '@modules/storefront-auth/domain/ports/login-usecase.port';
import {
	type IStorefrontPasswordHasher,
	STOREFRONT_PASSWORD_HASHER,
} from '@modules/storefront-auth/domain/ports/password-hasher.port';
import { IStorefrontRegisterUser } from '@modules/storefront-auth/domain/ports/register-usecase.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '@modules/storefront-auth/domain/ports/storefront-user-repository.port';
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
		@Inject(STOREFRONT_LOGIN_UC)
		private readonly loginUseCase: IStorefrontLoginUser
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

				const result = await this.uow.execute(async (tx) => {
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

					const loginResult = await this.loginUseCase.execute({
						storeId: input.storeId,
						email: input.email,
						password: input.password,
						ipAddress: input.ipAddress,
						userAgent: input.userAgent,
						tx,
					});

					if (loginResult.isErr()) {
						throw loginResult.error;
					}

					return loginResult.value;
				});

				this.logger.debug('User registered and verification email sent');

				return ok(result);
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
