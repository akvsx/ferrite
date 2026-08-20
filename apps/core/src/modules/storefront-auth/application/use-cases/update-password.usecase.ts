import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { InvalidLoginMethodError } from '../../domain/errors/invalid-login-method.error';
import {
	type IStorefrontPasswordHasher,
	STOREFRONT_PASSWORD_HASHER,
} from '../../domain/ports/password-hasher.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';
import type {
	IStorefrontUpdatePassword,
	UpdatePasswordError,
	UpdatePasswordInput,
} from '../../domain/ports/update-password-usecase.port';

@Injectable()
export class UpdatePasswordUseCase implements IStorefrontUpdatePassword {
	constructor(
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository,
		@Inject(STOREFRONT_PASSWORD_HASHER)
		private readonly hasher: IStorefrontPasswordHasher,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: UpdatePasswordInput
	): Promise<Result<void, UpdatePasswordError>> {
		return this.tracer.withSpan('storefront_auth.update_password', async () => {
			const user = await this.userRepo.findByIdAndStoreId(
				input.userId,
				input.storeId
			);

			if (!user) {
				return err(new InvalidCredentialsError());
			}

			if (!user.passwordHash) {
				// SSO-only account
				return err(new InvalidLoginMethodError());
			}

			// verify current password.
			if (!input.currentPassword) {
				return err(new InvalidCredentialsError());
			}

			const passwordValid = await this.hasher.isValid(
				input.currentPassword,
				user.passwordHash
			);

			if (!passwordValid) {
				return err(new InvalidCredentialsError());
			}

			const newPasswordHash = await this.hasher.hash(input.newPassword);

			await this.userRepo.updatePasswordHash(
				user.id,
				input.storeId,
				newPasswordHash,
				input.tx
			);

			this.logger.debug(
				`Password updated for user ${user.id} in store ${input.storeId}`
			);

			return ok(undefined);
		});
	}
}
