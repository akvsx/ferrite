import { isUniqueViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Category, CreateCategory } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { CategorySlugInUseError } from '../../domain/errors/category-slug-in-use.error';
import {
	CATEGORY_REPOSITORY,
	type ICategoryRepository,
} from '../../domain/ports/category.repository.port';
import type { ICreateCategoryUseCase } from '../../domain/ports/category-use-cases.port';

@Injectable()
export class CreateCategoryUseCase implements ICreateCategoryUseCase {
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
		data: CreateCategory;
	}): Promise<Result<Category, CategorySlugInUseError | Error>> {
		return this.tracer.withSpan('use-case.categories.create', async () => {
			this.logger.debug(
				`Creating category for store ${input.storeId} with slug ${input.data.slug}`
			);

			const existing = await this.categoryRepo.findBySlugAndStore(
				input.data.slug,
				input.storeId
			);

			if (existing) {
				return err(new CategorySlugInUseError(input.data.slug));
			}

			try {
				const category = await this.categoryRepo.create(
					input.storeId,
					input.data
				);
				return ok(category);
			} catch (error: any) {
				if (
					isUniqueViolation(error) &&
					(error.message?.includes('uq_categories_store_slug') ||
						error.constraint === 'uq_categories_store_slug')
				) {
					return err(new CategorySlugInUseError(input.data.slug));
				}
				throw error;
			}
		});
	}
}
