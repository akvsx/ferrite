import type { Category, CreateCategory, UpdateCategory } from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');

export interface ICategoryRepository {
	create(storeId: string, payload: CreateCategory): Promise<Category>;
	update(
		id: string,
		storeId: string,
		payload: UpdateCategory
	): Promise<Category | null>;
	findByIdAndStore(id: string, storeId: string): Promise<Category | null>;
	findBySlugAndStore(slug: string, storeId: string): Promise<Category | null>;
	findByStoreId(
		storeId: string,
		cursor?: string,
		limit?: number
	): Promise<PaginatedResponse<Category>>;
	delete(id: string, storeId: string): Promise<boolean>;
}
