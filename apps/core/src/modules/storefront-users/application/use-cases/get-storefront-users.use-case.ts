import { err, ok, type Result } from '@common/interfaces/result.interface';
import { type IUseCase } from '@common/interfaces/use-case.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import {
	type PaginatedResponse,
	type PaginationInput,
	type StorefrontUser,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IStorefrontUserRepository,
	STOREFRONT_USER_REPOSITORY,
} from '../../domain/ports/storefront-user-repository.port';

export interface GetStorefrontUsersUseCaseInput extends PaginationInput {
	storeId: string;
}

export type GetStorefrontUsersUseCaseOutput = PaginatedResponse<StorefrontUser>;

export type GetStorefrontUsersUseCaseError = Error;

@Injectable()
export class GetStorefrontUsersUseCase
	implements
		IUseCase<
			GetStorefrontUsersUseCaseInput,
			GetStorefrontUsersUseCaseOutput,
			GetStorefrontUsersUseCaseError
		>
{
	constructor(
		@Inject(STOREFRONT_USER_REPOSITORY)
		private readonly repo: IStorefrontUserRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: GetStorefrontUsersUseCaseInput
	): Promise<
		Result<GetStorefrontUsersUseCaseOutput, GetStorefrontUsersUseCaseError>
	> {
		return this.tracer.withSpan(
			'use-case.storefront-users.getStorefrontUsers',
			async () => {
				this.logger.debug(
					`Executing GetStorefrontUsersUseCase with storeId=${input.storeId}`
				);

				try {
					const result = await this.repo.findByStoreId(
						input.storeId,
						input.cursor,
						input.limit
					);

					this.logger.debug(
						`Successfully fetched ${result.items.length} storefront users for storeId=${input.storeId}`
					);

					return ok(result);
				} catch (e) {
					const error = e instanceof Error ? e : new Error(String(e));
					this.logger.error(
						`Failed to fetch storefront users for storeId=${input.storeId}, error=${error.message}`,
						error.stack
					);
					return err(error);
				}
			}
		);
	}
}
