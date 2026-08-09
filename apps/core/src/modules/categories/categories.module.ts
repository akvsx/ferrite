import { StoreModule } from '@modules/store';
import { Module } from '@nestjs/common';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { CATEGORY_REPOSITORY } from './domain/ports/category.repository.port';
import {
	CREATE_CATEGORY_UC,
	DELETE_CATEGORY_UC,
	GET_CATEGORY_UC,
	LIST_CATEGORIES_UC,
	UPDATE_CATEGORY_UC,
} from './domain/ports/category-use-cases.port';
import { CategoryAdminController } from './infrastructure/http/controllers/category.admin.controller';
import { CategoryStorefrontController } from './infrastructure/http/controllers/category.storefront.controller';
import { DrizzleCategoryRepository } from './infrastructure/persistence/repositories/drizzle-category.repository';

@Module({
	imports: [StoreModule],
	controllers: [CategoryAdminController, CategoryStorefrontController],
	providers: [
		{
			provide: CATEGORY_REPOSITORY,
			useClass: DrizzleCategoryRepository,
		},
		{
			provide: CREATE_CATEGORY_UC,
			useClass: CreateCategoryUseCase,
		},
		{
			provide: UPDATE_CATEGORY_UC,
			useClass: UpdateCategoryUseCase,
		},
		{
			provide: GET_CATEGORY_UC,
			useClass: GetCategoryUseCase,
		},
		{
			provide: LIST_CATEGORIES_UC,
			useClass: ListCategoriesUseCase,
		},
		{
			provide: DELETE_CATEGORY_UC,
			useClass: DeleteCategoryUseCase,
		},
	],
	exports: [CATEGORY_REPOSITORY],
})
export class CategoriesModule {}
