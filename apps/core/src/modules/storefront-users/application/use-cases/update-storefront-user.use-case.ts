import { err, ok, type Result } from '@common/interfaces/result.interface';
import { type IUseCase } from '@common/interfaces/use-case.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import {
	type StorefrontUser,
	type UpdateStorefrontUser,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { StorefrontUserNotFoundError } from '../../domain/errors/storefront-user-not-found.error';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

export interface UpdateStorefrontUserInput {
	userId: string;
	payload: UpdateStorefrontUser;
}

@Injectable()
export class UpdateStorefrontUserUseCase
	implements
		IUseCase<
			UpdateStorefrontUserInput,
			StorefrontUser,
			StorefrontUserNotFoundError
		>
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
		input: UpdateStorefrontUserInput
	): Promise<Result<StorefrontUser, StorefrontUserNotFoundError>> {
		return this.tracer.withSpan(
			'use-case.storefront-users.update',
			async () => {
				this.logger.debug(
					`Updating storefront user: ${input.userId} with payload: ${JSON.stringify(input.payload)}`
				);
				const user = await this.userRepository.update(
					input.userId,
					input.payload
				);
				if (!user) {
					this.logger.debug(
						`Storefront user to update not found: ${input.userId}`
					);
					return err(new StorefrontUserNotFoundError(input.userId));
				}
				this.logger.debug(`Successfully updated storefront user: ${user.id}`);
				return ok(user);
			}
		);
	}
}
