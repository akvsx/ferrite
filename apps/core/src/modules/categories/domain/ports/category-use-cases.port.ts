import type { IUseCase } from '@common/interfaces/use-case.interface';
import type {
	Category,
	CreateCategory,
	GetCategoriesQuery,
	UpdateCategory,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import type { CategoryNotFoundError } from '../errors/category-not-found.error';
import type { CategorySlugInUseError } from '../errors/category-slug-in-use.error';

export const CREATE_CATEGORY_UC = Symbol('ICreateCategoryUseCase');
export interface ICreateCategoryUseCase
	extends IUseCase<
		{ storeId: string; data: CreateCategory },
		Category,
		CategorySlugInUseError | Error
	> {}

export const UPDATE_CATEGORY_UC = Symbol('IUpdateCategoryUseCase');
export interface IUpdateCategoryUseCase
	extends IUseCase<
		{ id: string; storeId: string; data: UpdateCategory },
		Category,
		CategoryNotFoundError | CategorySlugInUseError | Error
	> {}

export const GET_CATEGORY_UC = Symbol('IGetCategoryUseCase');
export interface IGetCategoryUseCase
	extends IUseCase<
		{ id: string; storeId: string },
		Category,
		CategoryNotFoundError
	> {}

export const LIST_CATEGORIES_UC = Symbol('IListCategoriesUseCase');
export interface IListCategoriesUseCase
	extends IUseCase<
		{ storeId: string; query: GetCategoriesQuery },
		PaginatedResponse<Category>,
		Error
	> {}

export const DELETE_CATEGORY_UC = Symbol('IDeleteCategoryUseCase');
export interface IDeleteCategoryUseCase
	extends IUseCase<
		{ id: string; storeId: string },
		void,
		CategoryNotFoundError | Error
	> {}
