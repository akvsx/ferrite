import { Pagination } from '@common/decorators/pagination.decorator';
import { PublicRoute } from '@common/decorators/public-route.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	PaginatedProductResponse,
	PaginationInput,
	ProductDetail,
} from '@ferrite/schema';
import {
	Controller,
	Get,
	Inject,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductNotFoundError } from '../../../domain/errors/product-not-found.error';
import {
	GET_PRODUCT_BY_SLUG_UC,
	GET_PRODUCT_UC,
	type IGetProductBySlugUseCase,
	type IGetProductUseCase,
	type IListProductsUseCase,
	LIST_PRODUCTS_UC,
} from '../../../domain/ports/product-use-cases.port';
import {
	GetProductByIdDocs,
	GetProductBySlugDocs,
	ListProductsDocs,
} from '../docs/product.storefront.docs';

@ApiTags('Products')
@Controller('stores/:storeId/products')
export class ProductStorefrontController {
	constructor(
		@Inject(GET_PRODUCT_UC)
		private readonly getProductUc: IGetProductUseCase,
		@Inject(GET_PRODUCT_BY_SLUG_UC)
		private readonly getProductBySlugUc: IGetProductBySlugUseCase,
		@Inject(LIST_PRODUCTS_UC)
		private readonly listProductsUc: IListProductsUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Get()
	@ListProductsDocs()
	@PublicRoute()
	async listProducts(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Pagination() pagination: PaginationInput,
		@Query('search') search?: string,
		@Query('categoryId') categoryId?: string,
		@Query('supplierId') supplierId?: string
	): Promise<PaginatedProductResponse> {
		return this.tracer.withSpan('http.storefront.products.list', async () => {
			const result = await this.listProductsUc.execute({
				storeId,
				onlyActive: true,
				query: {
					...pagination,
					search,
					categoryId,
					supplierId,
				},
			});

			if (result.isErr()) {
				throw new NotFoundException('Failed to get products');
			}
			return {
				...result.value,
				items: result.value.items.map(this.omitCostPrice),
			};
		});
	}

	@Get('slug/:slug')
	@GetProductBySlugDocs()
	@PublicRoute()
	async getProductBySlug(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('slug') slug: string
	): Promise<ProductDetail> {
		return this.tracer.withSpan(
			'http.storefront.products.getBySlug',
			async () => {
				const result = await this.getProductBySlugUc.execute({
					slug,
					storeId,
					onlyActive: true,
				});

				if (result.isErr()) {
					if (result.error instanceof ProductNotFoundError) {
						throw new NotFoundException(result.error.message);
					}
					throw new NotFoundException('Failed to get product');
				}
				return this.omitCostPrice(result.value);
			}
		);
	}

	@Get(':productId')
	@GetProductByIdDocs()
	@PublicRoute()
	async getProductById(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('productId', ParseUUIDPipe) productId: string
	): Promise<ProductDetail> {
		return this.tracer.withSpan('http.storefront.products.get', async () => {
			const result = await this.getProductUc.execute({
				id: productId,
				storeId,
				onlyActive: true,
			});

			if (result.isErr()) {
				if (result.error instanceof ProductNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new NotFoundException('Failed to get product');
			}
			return this.omitCostPrice(result.value);
		});
	}

	omitCostPrice(product: ProductDetail): ProductDetail {
		return {
			...product,
			variants: product.variants.map(({ costPrice, ...rest }) => rest as any),
		};
	}
}
