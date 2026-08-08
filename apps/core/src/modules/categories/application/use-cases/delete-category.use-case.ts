import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found.error';
import {
	CATEGORY_REPOSITORY,
	type ICategoryRepository,
} from '../../domain/ports/category.repository.port';
import type { IDeleteCategoryUseCase } from '../../domain/ports/category-use-cases.port';

@Injectable()
export class DeleteCategoryUseCase implements IDeleteCategoryUseCase {
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
	}): Promise<Result<void, CategoryNotFoundError | Error>> {
		return this.tracer.withSpan('use-case.categories.delete', async () => {
			this.logger.debug(
				`Deleting category ${input.id} from store ${input.storeId}`
			);

			const deleted = await this.categoryRepo.delete(input.id, input.storeId);

			if (!deleted) {
				return err(new CategoryNotFoundError(input.id));
			}

			return ok();
		});
	}
}
