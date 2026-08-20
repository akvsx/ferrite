import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { storefrontPasswordResets } from '@core/database/schema/storefront-user.schema';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type {
	IStorefrontPasswordResetRepository,
	StorefrontPasswordReset,
	StorefrontPasswordResetInsert,
} from '../../../domain/ports/password-reset-repository.port';

@Injectable()
export class DrizzlePasswordResetRepository
	implements IStorefrontPasswordResetRepository
{
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(DB) private readonly db: TDatabase
	) {}

	async upsert(
		data: StorefrontPasswordResetInsert,
		tx?: ITransactionContext
	): Promise<void> {
		return this.tracer.withSpan(
			'storefront_auth.password_reset_repository.upsert',
			async () => {
				const executor = tx ? DrizzleUnitOfWork.unwrap(tx) : this.db;

				// Invalidate all existing tokens for this user first to prevent multiple active resets
				await executor
					.update(storefrontPasswordResets)
					.set({ usedAt: new Date() })
					.where(
						and(
							eq(storefrontPasswordResets.userId, data.userId),
							eq(storefrontPasswordResets.storeId, data.storeId),
							isNull(storefrontPasswordResets.usedAt)
						)
					);

				await executor.insert(storefrontPasswordResets).values({
					id: data.id,
					storeId: data.storeId,
					userId: data.userId,
					tokenHash: data.tokenHash,
					expiresAt: data.expiresAt,
				});
			}
		);
	}

	async findValidByTokenHash(
		tokenHash: string,
		tx?: ITransactionContext
	): Promise<StorefrontPasswordReset | null> {
		return this.tracer.withSpan(
			'storefront_auth.password_reset_repository.findValidByTokenHash',
			async () => {
				const executor = tx ? DrizzleUnitOfWork.unwrap(tx) : this.db;
				const now = new Date();

				const records = await executor
					.select()
					.from(storefrontPasswordResets)
					.where(
						and(
							eq(storefrontPasswordResets.tokenHash, tokenHash),
							isNull(storefrontPasswordResets.usedAt),
							sql`${storefrontPasswordResets.expiresAt} > ${now.toISOString()}`
						)
					)
					.limit(1);

				if (records.length === 0) {
					return null;
				}

				return records[0] as StorefrontPasswordReset;
			}
		);
	}

	async markAsUsed(id: string, tx?: ITransactionContext): Promise<boolean> {
		return this.tracer.withSpan(
			'storefront_auth.password_reset_repository.markAsUsed',
			async () => {
				const executor = tx ? DrizzleUnitOfWork.unwrap(tx) : this.db;

				const now = new Date();

				const updated = await executor
					.update(storefrontPasswordResets)
					.set({ usedAt: now })
					.where(
						and(
							eq(storefrontPasswordResets.id, id),
							isNull(storefrontPasswordResets.usedAt),
							gt(storefrontPasswordResets.expiresAt, now)
						)
					)
					.returning({ id: storefrontPasswordResets.id });

				return updated.length === 1;
			}
		);
	}
}
