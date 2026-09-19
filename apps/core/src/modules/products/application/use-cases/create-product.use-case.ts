import {
	isFkViolation,
	isUniqueViolation,
} from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import {
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { CreateProductInput, ProductDetail } from '@ferrite/schema';
import { SupplierNotFoundError } from '@modules/products/domain/errors/supplier-not-found.error';
import { ENQUEUE_GRAPHILE_EVENT_UC, type IEnqueue } from '@modules/queue';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProductSlugInUseError } from '../../domain/errors/product-slug-in-use.error';
import { SkuAlreadyExistsError } from '../../domain/errors/sku-already-exists.error';
import {
	type IProductRepository,
	PRODUCT_REPOSITORY,
} from '../../domain/ports/product.repository.port';
import type { ICreateProductUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class CreateProductUseCase implements ICreateProductUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(ENQUEUE_GRAPHILE_EVENT_UC) private readonly enqueue: IEnqueue,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		data: CreateProductInput;
	}): Promise<
		Result<ProductDetail, ProductSlugInUseError | SkuAlreadyExistsError | Error>
	> {
		return this.tracer.withSpan('use-case.products.create', async () => {
			this.logger.debug(
				`Creating product for store ${input.storeId} with slug ${input.data.slug}`
			);

			// Check slug uniqueness
			const existing = await this.productRepo.findBySlugAndStore(
				input.data.slug,
				input.storeId
			);
			if (existing) {
				return err(new ProductSlugInUseError(input.data.slug));
			}

			// Check SKU uniqueness for all variants in one shot
			if (input.data.variants.length > 0) {
				const skus = input.data.variants.map((v) => v.sku);
				const existingSkus = await this.productRepo.findExistingSkus(skus);
				if (existingSkus.length > 0) {
					return err(new SkuAlreadyExistsError(existingSkus[0]));
				}
			}

			try {
				const product = await this.uow.execute(async (tx) => {
					const createdProduct = await this.productRepo.createProduct(
						input.storeId,
						input.data,
						tx
					);

					if (createdProduct.variants.length > 0) {
						await this.enqueue.execute(tx, {
							identifier: 'variant-inventory-sync-queue',
							maxAttempts: 5,
							eventId: randomUUID(),
							eventType: 'inventory.variant.sync',
							payload: {
								storeId: input.storeId,
								variantIds: createdProduct.variants.map((v) => v.id),
							},
						});
					}

					return createdProduct;
				});
				return ok(product);
			} catch (error: any) {
				if (isFkViolation(error)) {
					if (input.data.supplierId) {
						return err(new SupplierNotFoundError(input.data.supplierId));
					}
				}

				if (isUniqueViolation(error)) {
					if (
						error.message?.includes('uq_products_store_slug') ||
						error.constraint === 'uq_products_store_slug' ||
						error.message?.includes('slug')
					) {
						return err(new ProductSlugInUseError(input.data.slug));
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
