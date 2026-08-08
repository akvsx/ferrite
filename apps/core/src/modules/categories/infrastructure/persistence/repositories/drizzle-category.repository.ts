import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { categories } from '@core/database/schema/category.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import { type ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import type { Category, CreateCategory, UpdateCategory } from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt } from 'drizzle-orm';
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
				const query = this.db
					.select()
					.from(categories)
					.where(
						cursor
							? and(eq(categories.storeId, storeId), gt(categories.id, cursor))
							: eq(categories.storeId, storeId)
					)
					.orderBy(asc(categories.id))
					.limit(limit + 1);

				const rows = await query;
				const hasMore = rows.length > limit;
				const items = hasMore ? rows.slice(0, -1) : rows;

				return {
					items: items.map(CategoryMapper.toDomain),
					nextCursor: hasMore ? items[items.length - 1].id : undefined,
				};
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
