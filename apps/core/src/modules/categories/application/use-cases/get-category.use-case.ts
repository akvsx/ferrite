import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Category } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import {
	CATEGORY_REPOSITORY,
	type ICategoryRepository,
} from '../../domain/ports/category.repository.port';
import type { IGetCategoryUseCase } from '../../domain/ports/category-use-cases.port';

@Injectable()
export class GetCategoryUseCase implements IGetCategoryUseCase {
	constructor(
		@Inject(CATEGORY_REPOSITORY)
		private readonly categoryRepo: ICategoryRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		id: string;
		storeId: string;
	}): Promise<Result<Category, CategoryNotFoundError>> {
		return this.tracer.withSpan('use-case.categories.get', async () => {
			const category = await this.categoryRepo.findByIdAndStore(
				input.id,
				input.storeId
			);

			if (!category) {
				return err(new CategoryNotFoundError(input.id));
			}

			return ok(category);
		});
	}
}
