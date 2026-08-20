import { isUniqueViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Category, UpdateCategory } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import { CategorySlugInUseError } from '../../domain/errors/category-slug-in-use.error';
import {
	CATEGORY_REPOSITORY,
	type ICategoryRepository,
} from '../../domain/ports/category.repository.port';
import type { IUpdateCategoryUseCase } from '../../domain/ports/category-use-cases.port';

@Injectable()
export class UpdateCategoryUseCase implements IUpdateCategoryUseCase {
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
		data: UpdateCategory;
	}): Promise<
		Result<Category, CategoryNotFoundError | CategorySlugInUseError | Error>
	> {
		return this.tracer.withSpan('use-case.categories.update', async () => {
			this.logger.debug(
				`Updating category ${input.id} for store ${input.storeId}`
			);

			const category = await this.categoryRepo.findByIdAndStore(
				input.id,
				input.storeId
			);
			if (!category) {
				return err(new CategoryNotFoundError(input.id));
			}

			if (input.data.slug && input.data.slug !== category.slug) {
				const existing = await this.categoryRepo.findBySlugAndStore(
					input.data.slug,
					input.storeId
				);
				if (existing && existing.id !== input.id) {
					return err(new CategorySlugInUseError(input.data.slug));
				}
			}

			try {
				const updated = await this.categoryRepo.update(
					input.id,
					input.storeId,
					input.data
				);

				if (!updated) {
					return err(new CategoryNotFoundError(input.id));
				}

				return ok(updated);
			} catch (error: any) {
				if (
					isUniqueViolation(error) &&
					(error.message?.includes('uq_categories_store_slug') ||
						error.constraint === 'uq_categories_store_slug')
				) {
					return err(new CategorySlugInUseError(input.data.slug!));
				}
				throw error;
			}
		});
	}
}
