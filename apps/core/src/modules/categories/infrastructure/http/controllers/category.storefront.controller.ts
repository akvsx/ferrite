import { Pagination } from '@common/decorators/pagination.decorator';
import { PublicRoute } from '@common/decorators/public-route.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	Category,
	PaginatedResponse,
	PaginationInput,
} from '@ferrite/schema';
import {
	Controller,
	Get,
	Inject,
	NotFoundException,
	Param,
	ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoryNotFoundError } from '../../../domain/errors/category-not-found.error';
import {
	GET_CATEGORY_UC,
	type IGetCategoryUseCase,
	type IListCategoriesUseCase,
	LIST_CATEGORIES_UC,
} from '../../../domain/ports/category-use-cases.port';
import {
	GetCategoriesDocs,
	GetCategoryByIdDocs,
} from '../docs/category.storefront.docs';

@ApiTags('Categories')
@Controller('stores/:storeId/categories')
export class CategoryStorefrontController {
	constructor(
		@Inject(GET_CATEGORY_UC)
		private readonly getCategoryUc: IGetCategoryUseCase,
		@Inject(LIST_CATEGORIES_UC)
		private readonly listCategoriesUc: IListCategoriesUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Get()
	@GetCategoriesDocs()
	@PublicRoute()
	async getCategories(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Pagination() pagination: PaginationInput
	): Promise<PaginatedResponse<Category>> {
		return this.tracer.withSpan('http.storefront.categories.list', async () => {
			const result = await this.listCategoriesUc.execute({
				storeId,
				query: pagination,
			});

			if (result.isErr()) {
				throw new NotFoundException('Failed to get categories');
			}
			return result.value;
		});
	}

	@Get(':categoryId')
	@GetCategoryByIdDocs()
	@PublicRoute()
	async getCategoryById(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('categoryId', ParseUUIDPipe) categoryId: string
	): Promise<Category> {
		return this.tracer.withSpan('http.storefront.categories.get', async () => {
			const result = await this.getCategoryUc.execute({
				id: categoryId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof CategoryNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new NotFoundException('Failed to get category');
			}
			return result.value;
		});
	}
}
