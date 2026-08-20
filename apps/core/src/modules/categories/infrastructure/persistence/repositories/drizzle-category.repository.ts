import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { categories } from '@core/database/schema/category.schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import { type ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import type { Category, CreateCategory, UpdateCategory } from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { ICategoryRepository } from '../../../domain/ports/category.repository.port';
import { CategoryMapper } from '../mappers/category.mapper';

@Injectable()
export class DrizzleCategoryRepository implements ICategoryRepository {
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	private storeFilter(id: string, storeId: string) {
		return and(eq(categories.id, id), eq(categories.storeId, storeId));
	}

	async create(storeId: string, payload: CreateCategory): Promise<Category> {
		return traceDbOp(
			this.tracer,
			'db.categories.insert',
			{ 'db.table': 'categories', 'db.operation': 'insert' },
			async () => {
				const [row] = await this.db
					.insert(categories)
					.values({
						storeId,
						parentId: payload.parentId,
						name: payload.name,
						slug: payload.slug,
						description: payload.description,
						sortOrder: payload.sortOrder,
						isActive: payload.isActive,
					})
					.returning();
				return CategoryMapper.toDomain(row);
			}
		);
	}

	async update(
		id: string,
		storeId: string,
		payload: UpdateCategory
	): Promise<Category | null> {
		return traceDbOp(
			this.tracer,
			'db.categories.update',
			{ 'db.table': 'categories', 'db.operation': 'update' },
			async () => {
				const [row] = await this.db
					.update(categories)
					.set({
						parentId: payload.parentId,
						name: payload.name,
						slug: payload.slug,
						description: payload.description,
						sortOrder: payload.sortOrder,
						isActive: payload.isActive,
						updatedAt: new Date(),
					})
					.where(this.storeFilter(id, storeId))
					.returning();
				return row ? CategoryMapper.toDomain(row) : null;
			}
		);
	}

	async findByIdAndStore(
		id: string,
		storeId: string
	): Promise<Category | null> {
		return traceDbOp(
			this.tracer,
			'db.categories.findByIdAndStore',
			{ 'db.table': 'categories', 'db.operation': 'select' },
			async () => {
				const [row] = await this.db
					.select()
					.from(categories)
					.where(this.storeFilter(id, storeId))
					.limit(1);
				return row ? CategoryMapper.toDomain(row) : null;
			}
		);
	}

	async findBySlugAndStore(
		slug: string,
		storeId: string
	): Promise<Category | null> {
		return traceDbOp(
			this.tracer,
			'db.categories.findBySlugAndStore',
			{ 'db.table': 'categories', 'db.operation': 'select' },
			async () => {
				const [row] = await this.db
					.select()
					.from(categories)
					.where(
						and(eq(categories.slug, slug), eq(categories.storeId, storeId))
					)
					.limit(1);
				return row ? CategoryMapper.toDomain(row) : null;
			}
		);
	}

	async findByStoreId(
		storeId: string,
		cursor?: string,
		limit: number = 20
	): Promise<PaginatedResponse<Category>> {
		return traceDbOp(
			this.tracer,
			'db.categories.findByStoreId',
			{ 'db.table': 'categories', 'db.operation': 'select' },
			async () => {
				const { where, orderBy, queryLimit } = cursorPaginationClauses({
					table: categories,
					idColumn: categories.id,
					sortColumn: categories.createdAt,
					cursor,
					limit,
					filters: [eq(categories.storeId, storeId)],
				});

				const rows = await this.db
					.select()
					.from(categories)
					.where(where)
					.orderBy(...orderBy)
					.limit(queryLimit);

				return buildPaginatedResponse(
					rows,
					limit,
					CategoryMapper.toDomain,
					(row) => row.id
				);
			}
		);
	}

	async delete(id: string, storeId: string): Promise<boolean> {
		return traceDbOp(
			this.tracer,
			'db.categories.delete',
			{ 'db.table': 'categories', 'db.operation': 'delete' },
			async () => {
				const [row] = await this.db
					.delete(categories)
					.where(this.storeFilter(id, storeId))
					.returning({ id: categories.id });
				return !!row;
			}
		);
	}
}
