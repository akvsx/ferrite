import { createHash } from 'node:crypto';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type ITransactionContext,
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token.error';
import {
	type IStorefrontPasswordHasher,
	STOREFRONT_PASSWORD_HASHER,
} from '../../domain/ports/password-hasher.port';
import {
	type IStorefrontPasswordResetRepository,
	STOREFRONT_PASSWORD_RESET_REPOSITORY,
} from '../../domain/ports/password-reset-repository.port';
import type {
	IStorefrontResetPassword,
	ResetPasswordError,
	ResetPasswordInput,
} from '../../domain/ports/reset-password-usecase.port';
import {
	type IStorefrontSessionRepository,
	STOREFRONT_SESSION_REPOSITORY,
} from '../../domain/ports/storefront-session-repository.port';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

@Injectable()
export class ResetPasswordUseCase implements IStorefrontResetPassword {
	constructor(
		@Inject(STOREFRONT_PASSWORD_RESET_REPOSITORY)
		private readonly resetRepo: IStorefrontPasswordResetRepository,
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepo: IStorefrontUserRepository,
		@Inject(STOREFRONT_SESSION_REPOSITORY)
		private readonly sessionRepo: IStorefrontSessionRepository,
		@Inject(STOREFRONT_PASSWORD_HASHER)
		private readonly hasher: IStorefrontPasswordHasher,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: ResetPasswordInput
	): Promise<Result<void, ResetPasswordError>> {
		return this.tracer.withSpan('storefront_auth.reset_password', async () => {
			const tokenHash = createHash('sha256').update(input.token).digest('hex');

			let committedUserId: string | undefined;

			// write the changes in transaction
			const result = await this.uow.execute(
				async (
					txn: ITransactionContext
				): Promise<Result<void, ResetPasswordError>> => {
					const resetRecord = await this.resetRepo.findValidByTokenHash(
						tokenHash,
						txn
					);

					if (!resetRecord || resetRecord.storeId !== input.storeId) {
						return err(new InvalidResetTokenError());
					}

					const consumed = await this.resetRepo.markAsUsed(resetRecord.id, txn);
					if (!consumed) return err(new InvalidResetTokenError());

					const newPasswordHash = await this.hasher.hash(input.newPassword);

					await this.userRepo.updatePasswordHash(
						resetRecord.userId,
						input.storeId,
						newPasswordHash,
						txn
					);

					this.logger.debug(
						`Password reset successfully for user ${resetRecord.userId}`
					);

					committedUserId = resetRecord.userId;
					return ok(undefined);
				}
			);

			// clear the sessions
			if (result.ok && committedUserId) {
				await this.sessionRepo.deleteAllByUserId(
					committedUserId,
					input.storeId
				);
			}

			return result.ok ? ok(undefined) : result;
		});
	}
}
