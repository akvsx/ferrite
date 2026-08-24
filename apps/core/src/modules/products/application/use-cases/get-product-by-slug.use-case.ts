import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { ProductDetail } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import {
	type IProductRepository,
	PRODUCT_REPOSITORY,
} from '../../domain/ports/product.repository.port';
import type { IGetProductBySlugUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class GetProductBySlugUseCase implements IGetProductBySlugUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		slug: string;
		storeId: string;
		onlyActive?: boolean;
	}): Promise<Result<ProductDetail, ProductNotFoundError | Error>> {
		return this.tracer.withSpan('use-case.products.getBySlug', async () => {
			const product = await this.productRepo.findBySlugAndStore(
				input.slug,
				input.storeId,
				input.onlyActive
			);

			if (!product) {
				return err(new ProductNotFoundError(input.slug));
			}

			return ok(product);
		});
	}
}
