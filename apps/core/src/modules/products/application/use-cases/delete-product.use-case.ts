import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import {
	type IProductRepository,
	PRODUCT_REPOSITORY,
} from '../../domain/ports/product.repository.port';
import type { IDeleteProductUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class DeleteProductUseCase implements IDeleteProductUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		id: string;
		storeId: string;
	}): Promise<Result<void, ProductNotFoundError | Error>> {
		return this.tracer.withSpan('use-case.products.delete', async () => {
			this.logger.debug(
				`Soft-deleting product ${input.id} from store ${input.storeId}`
			);

			const deleted = await this.productRepo.softDelete(
				input.id,
				input.storeId
			);

			if (!deleted) {
				return err(new ProductNotFoundError(input.id));
			}

			return ok();
		});
	}
}
