import type { IUseCase } from '@common/interfaces/use-case.interface';
import type {
	CreateProductInput,
	GetProductsQuery,
	ProductDetail,
	UpdateProductInput,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import type { ProductNotFoundError } from '../errors/product-not-found.error';
import type { ProductSlugInUseError } from '../errors/product-slug-in-use.error';
import type { SkuAlreadyExistsError } from '../errors/sku-already-exists.error';

// ── Create ──────────────────────────────────────

export const CREATE_PRODUCT_UC = Symbol('ICreateProductUseCase');
export interface ICreateProductUseCase
	extends IUseCase<
		{ storeId: string; data: CreateProductInput },
		ProductDetail,
		ProductSlugInUseError | SkuAlreadyExistsError | Error
	> {}

// ── Update ──────────────────────────────────────

export const UPDATE_PRODUCT_UC = Symbol('IUpdateProductUseCase');
export interface IUpdateProductUseCase
	extends IUseCase<
		{ id: string; storeId: string; data: UpdateProductInput },
		ProductDetail,
		ProductNotFoundError | ProductSlugInUseError | SkuAlreadyExistsError | Error
	> {}

// ── Delete ──────────────────────────────────────

export const DELETE_PRODUCT_UC = Symbol('IDeleteProductUseCase');
export interface IDeleteProductUseCase
	extends IUseCase<
		{ id: string; storeId: string },
		void,
		ProductNotFoundError | Error
	> {}

// ── Get by ID ───────────────────────────────────

export const GET_PRODUCT_UC = Symbol('IGetProductUseCase');
export interface IGetProductUseCase
	extends IUseCase<
		{ id: string; storeId: string; onlyActive?: boolean },
		ProductDetail,
		ProductNotFoundError | Error
	> {}

// ── Get by Slug ─────────────────────────────────

export const GET_PRODUCT_BY_SLUG_UC = Symbol('IGetProductBySlugUseCase');
export interface IGetProductBySlugUseCase
	extends IUseCase<
		{ slug: string; storeId: string; onlyActive?: boolean },
		ProductDetail,
		ProductNotFoundError | Error
	> {}

// ── List ────────────────────────────────────────

export const LIST_PRODUCTS_UC = Symbol('IListProductsUseCase');
export interface IListProductsUseCase
	extends IUseCase<
		{ storeId: string; query: GetProductsQuery; onlyActive?: boolean },
		PaginatedResponse<ProductDetail>,
		Error
	> {}
