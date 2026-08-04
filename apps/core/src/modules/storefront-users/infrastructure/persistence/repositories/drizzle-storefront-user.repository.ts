import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { storefrontUsers } from '@core/database/schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import { type ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import {
	type PaginatedResponse,
	type StorefrontUser,
	type UpdateStorefrontUser,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { type IStorefrontUserRepository } from '../../../domain/ports/storefront-user-repository.port';
import { StorefrontUserMapper } from '../mappers/storefront-user.mapper';

@Injectable()
export class DrizzleStorefrontUserRepository
	implements IStorefrontUserRepository
{
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	async findById(id: string, storeId: string): Promise<StorefrontUser | null> {
		return traceDbOp(
			this.tracer,
			'db.storefront_users.findById',
			{ 'db.table': 'storefront_users', 'db.operation': 'select' },
			async () => {
				const [row] = await this.db
					.select()
					.from(storefrontUsers)
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
					.limit(1);

				if (!row) return null;
				return StorefrontUserMapper.toDomain(row);
			}
		);
	}

	async findByStoreId(
		storeId: string,
		cursor?: string,
		limit: number = 20
	): Promise<PaginatedResponse<StorefrontUser>> {
		return traceDbOp(
			this.tracer,
			'db.storefront_users.findByStoreId',
			{ 'db.table': 'storefront_users', 'db.operation': 'select' },
			async () => {
				const queryLimit = limit + 1;

				const conditions = [
					eq(storefrontUsers.storeId, storeId),
					isNull(storefrontUsers.deletedAt),
				];

				if (cursor) {
					conditions.push(gt(storefrontUsers.id, cursor));
				}

				const rows = await this.db
					.select()
					.from(storefrontUsers)
					.where(and(...conditions))
					.orderBy(storefrontUsers.id)
					.limit(queryLimit);

				const hasNextPage = rows.length > limit;
				const results = hasNextPage ? rows.slice(0, -1) : rows;

				const nextCursor = hasNextPage
					? results[results.length - 1].id
					: undefined;

				return {
					items: results.map(StorefrontUserMapper.toDomain),
					nextCursor,
				};
			}
		);
	}

	async update(
		id: string,
		storeId: string,
		payload: UpdateStorefrontUser
	): Promise<StorefrontUser | null> {
		return traceDbOp(
			this.tracer,
			'db.storefront_users.update',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				const [updated] = await this.db
					.update(storefrontUsers)
					.set({
						...payload,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
					.returning();

				if (!updated) return null;
				return StorefrontUserMapper.toDomain(updated);
			}
		);
	}

	async delete(id: string, storeId: string): Promise<boolean> {
		return traceDbOp(
			this.tracer,
			'db.storefront_users.delete',
			{ 'db.table': 'storefront_users', 'db.operation': 'delete' },
			async () => {
				const [deleted] = await this.db
					.update(storefrontUsers)
					.set({ deletedAt: new Date() })
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
					.returning({ id: storefrontUsers.id });

				return !!deleted;
			}
		);
	}

	async setBanStatus(
		id: string,
		storeId: string,
		isBanned: boolean
	): Promise<StorefrontUser | null> {
		return traceDbOp(
			this.tracer,
			'db.storefront_users.setBanStatus',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				const [updated] = await this.db
					.update(storefrontUsers)
					.set({
						bannedAt: isBanned ? new Date() : null,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
					.returning();

				if (!updated) return null;
				return StorefrontUserMapper.toDomain(updated);
			}
		);
	}
}
