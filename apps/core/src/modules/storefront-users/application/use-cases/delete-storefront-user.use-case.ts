import { err, ok, type Result } from '@common/interfaces/result.interface';
import { type IUseCase } from '@common/interfaces/use-case.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { StorefrontUserNotFoundError } from '../../domain/errors/storefront-user-not-found.error';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

export interface DeleteStorefrontUserInput {
	userId: string;
}

@Injectable()
export class DeleteStorefrontUserUseCase
	implements
		IUseCase<DeleteStorefrontUserInput, void, StorefrontUserNotFoundError>
{
	constructor(
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly userRepository: IStorefrontUserRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: DeleteStorefrontUserInput
	): Promise<Result<void, StorefrontUserNotFoundError>> {
		return this.tracer.withSpan(
			'use-case.storefront-users.delete',
			async () => {
				this.logger.debug(`Deleting storefront user: ${input.userId}`);
				const user = await this.userRepository.findById(input.userId);
				if (!user) {
					this.logger.debug(
						`Storefront user to delete not found: ${input.userId}`
					);
					return err(new StorefrontUserNotFoundError(input.userId));
				}
				await this.userRepository.delete(input.userId);
				this.logger.debug(
					`Successfully soft deleted storefront user: ${input.userId}`
				);
				return ok(undefined);
			}
		);
	}
}
