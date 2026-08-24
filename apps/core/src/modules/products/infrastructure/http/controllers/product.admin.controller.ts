import { UseRealm } from '@auth/index';
import { Pagination } from '@common/decorators/pagination.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	PaginatedProductResponse,
	PaginationInput,
	ProductDetail,
} from '@ferrite/schema';
import { StorePermissionGuard } from '@modules/store/infrastructure/http/guards/store-permission.guard';
import {
	BadRequestException,
	Body,
	ConflictException,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	InternalServerErrorException,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductNotFoundError } from '../../../domain/errors/product-not-found.error';
import { ProductSlugInUseError } from '../../../domain/errors/product-slug-in-use.error';
import { SkuAlreadyExistsError } from '../../../domain/errors/sku-already-exists.error';
import {
	CREATE_PRODUCT_UC,
	DELETE_PRODUCT_UC,
	GET_PRODUCT_UC,
	type ICreateProductUseCase,
	type IDeleteProductUseCase,
	type IGetProductUseCase,
	type IListProductsUseCase,
	type IUpdateProductUseCase,
	LIST_PRODUCTS_UC,
	UPDATE_PRODUCT_UC,
} from '../../../domain/ports/product-use-cases.port';
import {
	CreateProductDocs,
	DeleteProductDocs,
	GetProductByIdDocs,
	ListProductsDocs,
	UpdateProductDocs,
} from '../docs/product.admin.docs';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@ApiTags('Products')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@Controller('stores/:storeId/products/admin')
@UseRealm('platform')
export class ProductAdminController {
	constructor(
		@Inject(CREATE_PRODUCT_UC)
		private readonly createProductUc: ICreateProductUseCase,
		@Inject(UPDATE_PRODUCT_UC)
		private readonly updateProductUc: IUpdateProductUseCase,
		@Inject(DELETE_PRODUCT_UC)
		private readonly deleteProductUc: IDeleteProductUseCase,
		@Inject(LIST_PRODUCTS_UC)
		private readonly listProductsUc: IListProductsUseCase,
		@Inject(GET_PRODUCT_UC)
		private readonly getProductUc: IGetProductUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Get()
	@ListProductsDocs()
	@RequirePermission('products.read')
	async listProducts(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Pagination() pagination: PaginationInput,
		@Query('search') search?: string,
		@Query('categoryId') categoryId?: string,
		@Query('supplierId') supplierId?: string,
		@Query('status') status?: 'draft' | 'active' | 'archived'
	): Promise<PaginatedProductResponse> {
		return this.tracer.withSpan('http.admin.products.list', async () => {
			const result = await this.listProductsUc.execute({
				storeId,
				query: { ...pagination, search, categoryId, supplierId, status },
			});
			if (result.isErr()) {
				throw new InternalServerErrorException('Failed to list products');
			}
			return result.value;
		});
	}

	@Get(':productId')
	@GetProductByIdDocs()
	@RequirePermission('products.read')
	async getProductById(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('productId', ParseUUIDPipe) productId: string
	): Promise<ProductDetail> {
		return this.tracer.withSpan('http.admin.products.getById', async () => {
			const result = await this.getProductUc.execute({
				id: productId,
				storeId,
			});
			if (result.isErr()) {
				if (result.error instanceof ProductNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to get product');
			}
			return result.value;
		});
	}

	@Post()
	@CreateProductDocs()
	@RequirePermission('products.create')
	async createProduct(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: CreateProductDto
	): Promise<ProductDetail> {
		return this.tracer.withSpan('http.admin.products.create', async () => {
			const result = await this.createProductUc.execute({
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof ProductSlugInUseError) {
					throw new BadRequestException(result.error.message);
				}
				if (result.error instanceof SkuAlreadyExistsError) {
					throw new ConflictException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to create product');
			}
			return result.value;
		});
	}

	@Patch(':productId')
	@UpdateProductDocs()
	@RequirePermission('products.update')
	async updateProduct(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('productId', ParseUUIDPipe) productId: string,
		@Body() payload: UpdateProductDto
	): Promise<ProductDetail> {
		return this.tracer.withSpan('http.admin.products.update', async () => {
			const result = await this.updateProductUc.execute({
				id: productId,
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof ProductNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof ProductSlugInUseError) {
					throw new BadRequestException(result.error.message);
				}
				if (result.error instanceof SkuAlreadyExistsError) {
					throw new ConflictException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to update product');
			}
			return result.value;
		});
	}

	@Delete(':productId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@DeleteProductDocs()
	@RequirePermission('products.delete')
	async deleteProduct(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('productId', ParseUUIDPipe) productId: string
	): Promise<void> {
		return this.tracer.withSpan('http.admin.products.delete', async () => {
			const result = await this.deleteProductUc.execute({
				id: productId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof ProductNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to delete product');
			}
		});
	}
}
