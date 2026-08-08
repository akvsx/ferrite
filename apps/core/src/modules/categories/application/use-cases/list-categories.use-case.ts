import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Category, GetCategoriesQuery } from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import {
	CATEGORY_REPOSITORY,
	type ICategoryRepository,
} from '../../domain/ports/category.repository.port';
import type { IListCategoriesUseCase } from '../../domain/ports/category-use-cases.port';

@Injectable()
export class ListCategoriesUseCase implements IListCategoriesUseCase {
	constructor(
		@Inject(CATEGORY_REPOSITORY)
		private readonly categoryRepo: ICategoryRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		query: GetCategoriesQuery;
	}): Promise<Result<PaginatedResponse<Category>, Error>> {
		return this.tracer.withSpan('use-case.categories.list', async () => {
			const result = await this.categoryRepo.findByStoreId(
				input.storeId,
				'0', //input.query.cursor,
				input.query.limit
			);

			return ok(result);
		});
	}
}
