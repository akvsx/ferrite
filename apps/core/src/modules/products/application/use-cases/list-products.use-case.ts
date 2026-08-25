import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { GetProductsQuery, ProductDetail } from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IProductRepository,
	PRODUCT_REPOSITORY,
} from '../../domain/ports/product.repository.port';
import type { IListProductsUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class ListProductsUseCase implements IListProductsUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		query: GetProductsQuery;
		onlyActive?: boolean;
	}): Promise<Result<PaginatedResponse<ProductDetail>, Error>> {
		return this.tracer.withSpan('use-case.products.list', async () => {
			const result = await this.productRepo.findByStoreId(
				input.storeId,
				input.query,
				input.onlyActive
			);

			return ok(result);
		});
	}
}
