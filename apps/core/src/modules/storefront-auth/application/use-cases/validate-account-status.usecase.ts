import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { AccountBannedError } from '../../domain/errors/account-banned.error';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error';
import type {
	IValidateAccountStatus,
	ValidateAccountStatusInput,
} from '../../domain/ports/validate-account-status-usecase.port';

@Injectable()
export class ValidateAccountStatusUseCase implements IValidateAccountStatus {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: ValidateAccountStatusInput
	): Promise<Result<void, EmailNotVerifiedError | AccountBannedError>> {
		return this.tracer.withSpan(
			'use-case.storefront-auth.validate-account-status',
			async () => {
				this.logger.debug(
					`Executing ValidateAccountStatusUseCase for user: ${input.user.id}`
				);

				if (input.user.bannedAt !== null) {
					this.logger.debug(`User ${input.user.id} is banned.`);
					return err(new AccountBannedError());
				}

				if (input.user.emailVerifiedAt === null) {
					this.logger.debug(`User ${input.user.id} email is not verified.`);
					return err(new EmailNotVerifiedError());
				}

				this.logger.debug(`Successfully executed ValidateAccountStatusUseCase`);
				return ok(undefined);
			}
		);
	}
}
