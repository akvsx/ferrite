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

export interface AdminSetBanStatusStorefrontUserInput {
	userId: string;
	isBanned: boolean;
}

@Injectable()
export class AdminSetBanStatusStorefrontUserUseCase
	implements
		IUseCase<
			AdminSetBanStatusStorefrontUserInput,
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
		input: AdminSetBanStatusStorefrontUserInput
	): Promise<Result<StorefrontUser, StorefrontUserNotFoundError>> {
		return this.tracer.withSpan(
			'use-case.storefront-users.admin-set-ban-status',
			async () => {
				this.logger.debug(
					`Setting ban status to ${input.isBanned} for storefront user: ${input.userId}`
				);
				const user = await this.userRepository.setBanStatus(
					input.userId,
					input.isBanned
				);
				if (!user) {
					this.logger.debug(
						`Storefront user to update ban status not found: ${input.userId}`
					);
					return err(new StorefrontUserNotFoundError(input.userId));
				}
				this.logger.debug(
					`Successfully set ban status to ${input.isBanned} for storefront user: ${user.id}`
				);
				return ok(user);
			}
		);
	}
}
