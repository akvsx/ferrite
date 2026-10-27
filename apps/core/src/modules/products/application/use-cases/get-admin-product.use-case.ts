import { err, ok, Result } from '@common/interfaces/result.interface';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { AdminProductDetail, AdminProductDetailSchema } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found.error';
import type { IInventoryService } from '../../domain/ports/inventory-service.port';
import { INVENTORY_SERVICE } from '../../domain/ports/inventory-service.port';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product.repository.port';
import type { IGetAdminProductUseCase } from '../../domain/ports/product-use-cases.port';

@Injectable()
export class GetAdminProductUseCase implements IGetAdminProductUseCase {
	constructor(
		@Inject(PRODUCT_REPOSITORY)
		private readonly productRepo: IProductRepository,
		@Inject(INVENTORY_SERVICE)
		private readonly inventoryService: IInventoryService,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	async execute(input: {
		id: string;
		storeId: string;
	}): Promise<Result<AdminProductDetail, ProductNotFoundError | Error>> {
		return this.tracer.withSpan(
			'use-case.products.get-admin-product',
			async () => {
				const product = await this.productRepo.findAdminByIdAndStore(
					input.id,
					input.storeId
				);

				if (!product) {
					return err(new ProductNotFoundError(input.id));
				}

				const variantIds = product.variants.map((v) => v.id);

				const adminProduct: AdminProductDetail = {
					...product,
					variants: product.variants.map((v) => ({ ...v, inventoryItems: [] })),
				};

				if (variantIds.length > 0) {
					const inventoryResult =
						await this.inventoryService.getInventoryForVariants(
							input.storeId,
							variantIds
						);

					if (inventoryResult.isOk()) {
						const inventoryMap = inventoryResult.value;
						adminProduct.variants = product.variants.map((v) => ({
							...v,
							inventoryItems: inventoryMap[v.id] || [],
						}));
					} else {
						// We might choose to fail or just return the product without inventory.
						// Since it's an admin view, returning error is safer so they know it failed.
						return err(inventoryResult.error);
					}
				}

				// Validate through schema to ensure correctness
				const parsed = AdminProductDetailSchema.safeParse(adminProduct);
				if (!parsed.success) {
					return err(
						new Error(
							'Failed to parse AdminProductDetail: ' + parsed.error.message
						)
					);
				}

				return ok(parsed.data);
			}
		);
	}
}
