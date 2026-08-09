import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { storefrontUsers } from '@core/database/schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import { type ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import {
	type PaginatedResponse,
	type StorefrontUser,
	type UpdateStorefrontUser,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
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
				const { where, orderBy, queryLimit } = cursorPaginationClauses({
					table: storefrontUsers,
					idColumn: storefrontUsers.id,
					sortColumn: storefrontUsers.createdAt,
					cursor,
					limit,
					filters: [
						eq(storefrontUsers.storeId, storeId),
						isNull(storefrontUsers.deletedAt),
					],
				});

				const rows = await this.db
					.select()
					.from(storefrontUsers)
					.where(where)
					.orderBy(orderBy)
					.limit(queryLimit);

				return buildPaginatedResponse(
					rows,
					limit,
					StorefrontUserMapper.toDomain,
					(row) => row.id
				);
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
