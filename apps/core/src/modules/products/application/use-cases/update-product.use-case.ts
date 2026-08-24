import { isUniqueViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { ProductDetail, UpdateProductInput } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import { ProductSlugInUseError } from '../../domain/errors/product-slug-in-use.error';
import { SkuAlreadyExistsError } from '../../domain/errors/sku-already-exists.error';
import {
	type IProductRepository,
	PRODUCT_REPOSITORY,
} from '../../domain/ports/product.repository.port';
import type { IUpdateProductUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class UpdateProductUseCase implements IUpdateProductUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		id: string;
		storeId: string;
		data: UpdateProductInput;
	}): Promise<
		Result<
			ProductDetail,
			| ProductNotFoundError
			| ProductSlugInUseError
			| SkuAlreadyExistsError
			| Error
		>
	> {
		return this.tracer.withSpan('use-case.products.update', async () => {
			this.logger.debug(
				`Updating product ${input.id} for store ${input.storeId}`
			);

			// Verify product exists
			const product = await this.productRepo.findByIdAndStore(
				input.id,
				input.storeId
			);
			if (!product) {
				return err(new ProductNotFoundError(input.id));
			}

			// Check slug uniqueness if changed
			if (input.data.slug && input.data.slug !== product.slug) {
				const existing = await this.productRepo.findBySlugAndStore(
					input.data.slug,
					input.storeId
				);
				if (existing && existing.id !== input.id) {
					return err(new ProductSlugInUseError(input.data.slug));
				}
			}

			// Check SKU uniqueness for new variants (excluding current product's variants)
			if (input.data.variants && input.data.variants.length > 0) {
				const skus = input.data.variants.map((v) => v.sku);
				const existingSkus = await this.productRepo.findExistingSkus(
					skus,
					input.id
				);
				if (existingSkus.length > 0) {
					return err(new SkuAlreadyExistsError(existingSkus[0]));
				}
			}

			try {
				const updated = await this.uow.execute((tx) =>
					this.productRepo.updateProduct(
						input.id,
						input.storeId,
						input.data,
						tx
					)
				);

				if (!updated) {
					return err(new ProductNotFoundError(input.id));
				}

				return ok(updated);
			} catch (error: any) {
				if (isUniqueViolation(error)) {
					if (
						error.message?.includes('uq_products_store_slug') ||
						error.constraint === 'uq_products_store_slug' ||
						error.message?.includes('slug')
					) {
						return err(new ProductSlugInUseError(input.data.slug!));
					}
					if (
						error.message?.includes('uq_product_variants_sku') ||
						error.constraint === 'uq_product_variants_sku' ||
						error.message?.includes('sku') ||
						error.constraint?.includes('sku')
					) {
						return err(new SkuAlreadyExistsError('duplicate SKU'));
					}
				}
				throw error;
			}
		});
	}
}
