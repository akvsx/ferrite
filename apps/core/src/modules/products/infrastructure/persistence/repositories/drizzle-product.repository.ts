import {
	type ITransactionContext,
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	CreateProductInput,
	GetProductsQuery,
	ProductDetail,
	UpdateProductInput,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import type { IProductRepository } from '../../../domain/ports/product.repository.port';
import { executeCreateProduct } from './queries/create-product.query';
import { executeSoftDelete } from './queries/delete-product.query';
import { executeFindExistingSkus } from './queries/exists-sku.query';
import {
	executeFindByIdAndStore,
	executeFindBySlugAndStore,
	executeFindByStoreId,
} from './queries/find-products.query';
import { executeUpdateProduct } from './queries/update-product.query';

@Injectable()
export class DrizzleProductRepository implements IProductRepository {
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	// Aggregate Writes

	async createProduct(
		storeId: string,
		input: CreateProductInput,
		tx?: ITransactionContext
	): Promise<ProductDetail> {
		const run = (ctx: ITransactionContext) =>
			executeCreateProduct(this.tracer, ctx, storeId, input);

		if (tx) {
			return run(tx);
		}
		return this.uow.execute(run);
	}

	async updateProduct(
		id: string,
		storeId: string,
		input: UpdateProductInput,
		tx?: ITransactionContext
	): Promise<ProductDetail | null> {
		const run = (ctx: ITransactionContext) =>
			executeUpdateProduct(this.tracer, ctx, id, storeId, input);

		if (tx) {
			return run(tx);
		}
		return this.uow.execute(run);
	}

	async softDelete(id: string, storeId: string): Promise<boolean> {
		return executeSoftDelete(this.tracer, this.db, id, storeId);
	}

	// Reads

	async findByIdAndStore(
		id: string,
		storeId: string,
		onlyActive?: boolean
	): Promise<ProductDetail | null> {
		return executeFindByIdAndStore(
			this.tracer,
			this.db,
			id,
			storeId,
			onlyActive
		);
	}

	async findBySlugAndStore(
		slug: string,
		storeId: string,
		onlyActive?: boolean
	): Promise<ProductDetail | null> {
		return executeFindBySlugAndStore(
			this.tracer,
			this.db,
			slug,
			storeId,
			onlyActive
		);
	}

	async findByStoreId(
		storeId: string,
		query: GetProductsQuery,
		onlyActive?: boolean
	): Promise<PaginatedResponse<ProductDetail>> {
		return executeFindByStoreId(
			this.tracer,
			this.db,
			storeId,
			query,
			onlyActive
		);
	}

	// Helpers

	async findExistingSkus(
		skus: string[],
		excludeProductId?: string
	): Promise<string[]> {
		return executeFindExistingSkus(
			this.tracer,
			this.db,
			skus,
			excludeProductId
		);
	}
}
