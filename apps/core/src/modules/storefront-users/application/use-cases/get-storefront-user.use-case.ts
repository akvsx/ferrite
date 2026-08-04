import { err, ok, type Result } from '@common/interfaces/result.interface';
import { type IUseCase } from '@common/interfaces/use-case.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { type StorefrontUser } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { StorefrontUserNotFoundError } from '../../domain/errors/storefront-user-not-found.error';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

export interface GetStorefrontUserInput {
	userId: string;
	storeId: string;
}

@Injectable()
export class GetStorefrontUserUseCase
	implements
		IUseCase<
			GetStorefrontUserInput,
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
		input: GetStorefrontUserInput
	): Promise<Result<StorefrontUser, StorefrontUserNotFoundError>> {
		return this.tracer.withSpan('use-case.storefront-users.get', async () => {
			this.logger.debug(`Getting storefront user: ${input.userId}`);
			const user = await this.userRepository.findById(
				input.userId,
				input.storeId
			);
			if (!user) {
				this.logger.debug(`Storefront user not found: ${input.userId}`);
				return err(new StorefrontUserNotFoundError(input.userId));
			}
			this.logger.debug(`Successfully retrieved storefront user: ${user.id}`);
			return ok(user);
		});
	}
}
