import { UseRealm } from '@auth/index';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Category } from '@ferrite/schema';
import { StorePermissionGuard } from '@modules/store/infrastructure/http/guards/store-permission.guard';
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	HttpCode,
	HttpStatus,
	Inject,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoryNotFoundError } from '../../../domain/errors/category-not-found.error';
import { CategorySlugInUseError } from '../../../domain/errors/category-slug-in-use.error';
import {
	CREATE_CATEGORY_UC,
	DELETE_CATEGORY_UC,
	type ICreateCategoryUseCase,
	type IDeleteCategoryUseCase,
	type IUpdateCategoryUseCase,
	UPDATE_CATEGORY_UC,
} from '../../../domain/ports/category-use-cases.port';
import {
	CreateCategoryDocs,
	DeleteCategoryDocs,
	UpdateCategoryDocs,
} from '../docs/category.admin.docs';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@Controller('stores/:storeId/categories/admin')
@UseRealm('platform')
export class CategoryAdminController {
	constructor(
		@Inject(CREATE_CATEGORY_UC)
		private readonly createCategoryUc: ICreateCategoryUseCase,
		@Inject(UPDATE_CATEGORY_UC)
		private readonly updateCategoryUc: IUpdateCategoryUseCase,
		@Inject(DELETE_CATEGORY_UC)
		private readonly deleteCategoryUc: IDeleteCategoryUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Post()
	@CreateCategoryDocs()
	@RequirePermission('categories.create')
	async createCategory(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: CreateCategoryDto
	): Promise<Category> {
		return this.tracer.withSpan('http.admin.categories.create', async () => {
			const result = await this.createCategoryUc.execute({
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof CategorySlugInUseError) {
					throw new BadRequestException(result.error.message);
				}
				throw new BadRequestException('Failed to create category');
			}
			return result.value;
		});
	}

	@Patch(':categoryId')
	@UpdateCategoryDocs()
	@RequirePermission('categories.update')
	async updateCategory(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('categoryId', ParseUUIDPipe) categoryId: string,
		@Body() payload: UpdateCategoryDto
	): Promise<Category> {
		return this.tracer.withSpan('http.admin.categories.update', async () => {
			const result = await this.updateCategoryUc.execute({
				id: categoryId,
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof CategoryNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof CategorySlugInUseError) {
					throw new BadRequestException(result.error.message);
				}
				throw new BadRequestException('Failed to update category');
			}
			return result.value;
		});
	}

	@Delete(':categoryId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@DeleteCategoryDocs()
	@RequirePermission('categories.delete')
	async deleteCategory(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('categoryId', ParseUUIDPipe) categoryId: string
	): Promise<void> {
		return this.tracer.withSpan('http.admin.categories.delete', async () => {
			const result = await this.deleteCategoryUc.execute({
				id: categoryId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof CategoryNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new BadRequestException('Failed to delete category');
			}
		});
	}
}
