import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type {
	CreateProductInput,
	GetProductsQuery,
	ProductDetail,
	UpdateProductInput,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');

export interface IProductRepository {
	// Aggregate writes (UoW-aware)
	createProduct(
		storeId: string,
		input: CreateProductInput,
		tx?: ITransactionContext
	): Promise<ProductDetail>;

	updateProduct(
		id: string,
		storeId: string,
		input: UpdateProductInput,
		tx?: ITransactionContext
	): Promise<ProductDetail | null>;

	softDelete(id: string, storeId: string): Promise<boolean>;

	// Reads
	findByIdAndStore(
		id: string,
		storeId: string,
		onlyActive?: boolean
	): Promise<ProductDetail | null>;

	findBySlugAndStore(
		slug: string,
		storeId: string,
		onlyActive?: boolean
	): Promise<ProductDetail | null>;

	findByStoreId(
		storeId: string,
		query: GetProductsQuery,
		onlyActive?: boolean
	): Promise<PaginatedResponse<ProductDetail>>;

	// Helpers
	findExistingSkus(
		skus: string[],
		excludeProductId?: string
	): Promise<string[]>;
}
