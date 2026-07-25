import { pgErrorCode } from '@common/errors/handlers/pg-error-code';
import {
	type ITransactionContext,
	type IUnitOfWork,
	UNIT_OF_WORK,
} from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { storefrontUsers } from '@core/database/schema/storefront-user.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import {
	CreateStorefrontUserInput,
	StorefrontUser,
} from '@ferrite/schema/storefront-auth/storefront-user.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { EmailAlreadyRegisteredError } from '../../../domain/errors/email-already-registered.error';
import type { IStorefrontUserRepository } from '../../../domain/ports/storefront-user-repository.port';
import { StorefrontUserMapper } from '../mappers/storefront-user.mapper';

@Injectable()
export class DrizzleStorefrontUserRepository
	implements IStorefrontUserRepository
{
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork
	) {}

	private get typedDb(): TDatabase {
		return this.db;
	}

	async create(
		data: CreateStorefrontUserInput,
		tx?: ITransactionContext
	): Promise<StorefrontUser> {
		const normalizedData = StorefrontUserMapper.toPersistenceCreate(data);
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.create',
			{ 'db.table': 'storefront_users', 'db.operation': 'insert' },
			async () => {
				if (tx) {
					return this.runCreate(tx, normalizedData);
				}
				return this.uow.execute(async (ctx) =>
					this.runCreate(ctx, normalizedData)
				);
			}
		);
	}

	private async runCreate(
		ctx: ITransactionContext,
		data: CreateStorefrontUserInput
	): Promise<StorefrontUser> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		try {
			const [inserted] = await traceDbOp(
				this.tracer,
				'db.storefrontUsers.insert',
				{ 'db.table': 'storefront_users', 'db.operation': 'insert' },
				() =>
					executor
						.insert(storefrontUsers)
						.values({
							id: data.id,
							storeId: data.storeId,
							email: data.email,
							displayName: data.displayName,
							passwordHash: data.passwordHash,
						})
						.returning()
			);
			return StorefrontUserMapper.toDomain(inserted);
		} catch (error: any) {
			if (pgErrorCode(error) === '23505') {
				throw new EmailAlreadyRegisteredError();
			}
			throw error;
		}
	}

	async findByStoreIdAndEmail(
		storeId: string,
		email: string
	): Promise<StorefrontUser | null> {
		const normalizedEmail = StorefrontUserMapper.normalizeEmail(email);
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.findByStoreIdAndEmail',
			{ 'db.table': 'storefront_users', 'db.operation': 'select' },
			async () => {
				const [user] = await this.typedDb
					.select()
					.from(storefrontUsers)
					.where(
						and(
							eq(storefrontUsers.storeId, storeId),
							eq(sql`lower(${storefrontUsers.email})`, normalizedEmail),
							isNull(storefrontUsers.deletedAt)
						)
					)
					.limit(1);

				return user ? StorefrontUserMapper.toDomain(user) : null;
			}
		);
	}

	async findByIdAndStoreId(
		id: string,
		storeId: string
	): Promise<StorefrontUser | null> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.findByIdAndStoreId',
			{ 'db.table': 'storefront_users', 'db.operation': 'select' },
			async () => {
				const [user] = await this.typedDb
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

				return user ? StorefrontUserMapper.toDomain(user) : null;
			}
		);
	}

	async incrementFailedLogins(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.incrementFailedLogins',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runIncrementFailedLogins(tx, id, storeId);
				}
				return this.uow.execute(async (ctx) =>
					this.runIncrementFailedLogins(ctx, id, storeId)
				);
			}
		);
	}

	private async runIncrementFailedLogins(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateFailedLogins',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						failedLoginCount: sql`${storefrontUsers.failedLoginCount} + 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async resetFailedLogins(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.resetFailedLogins',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runResetFailedLogins(tx, id, storeId);
				}
				return this.uow.execute(async (ctx) =>
					this.runResetFailedLogins(ctx, id, storeId)
				);
			}
		);
	}

	private async runResetFailedLogins(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateResetFailedLogins',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						failedLoginCount: 0,
						lockedUntil: null,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async updateLockedUntil(
		id: string,
		storeId: string,
		lockedUntil: Date | null,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateLockedUntil',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runUpdateLockedUntil(tx, id, storeId, lockedUntil);
				}
				return this.uow.execute(async (ctx) =>
					this.runUpdateLockedUntil(ctx, id, storeId, lockedUntil)
				);
			}
		);
	}

	private async runUpdateLockedUntil(
		ctx: ITransactionContext,
		id: string,
		storeId: string,
		lockedUntil: Date | null
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateLockedUntilValue',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						lockedUntil,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async ban(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.ban',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runBan(tx, id, storeId);
				}
				return this.uow.execute(async (ctx) => this.runBan(ctx, id, storeId));
			}
		);
	}

	private async runBan(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateBan',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						bannedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async softDelete(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.softDelete',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runSoftDelete(tx, id, storeId);
				}
				return this.uow.execute(async (ctx) =>
					this.runSoftDelete(ctx, id, storeId)
				);
			}
		);
	}

	private async runSoftDelete(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateSoftDelete',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						deletedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async getAllByStoreId(
		storeId: string,
		includeBanned?: boolean
	): Promise<StorefrontUser[]> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.getAllByStoreId',
			{ 'db.table': 'storefront_users', 'db.operation': 'select' },
			async () => {
				const conditions = [
					eq(storefrontUsers.storeId, storeId),
					isNull(storefrontUsers.deletedAt),
				];

				if (!includeBanned) {
					conditions.push(isNull(storefrontUsers.bannedAt));
				}

				const query = this.typedDb
					.select()
					.from(storefrontUsers)
					.where(and(...conditions));

				const users = await query;
				return users.map((user) => StorefrontUserMapper.toDomain(user));
			}
		);
	}

	async markEmailVerified(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.markEmailVerified',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runMarkEmailVerified(tx, id, storeId);
				}
				return this.uow.execute((ctx) =>
					this.runMarkEmailVerified(ctx, id, storeId)
				);
			}
		);
	}

	private async runMarkEmailVerified(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateEmailVerifiedAt',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						emailVerifiedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}

	async updateLastLoginAt(
		id: string,
		storeId: string,
		tx?: ITransactionContext
	): Promise<void> {
		return traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateLastLoginAt',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			async () => {
				if (tx) {
					return this.runUpdateLastLoginAt(tx, id, storeId);
				}
				return this.uow.execute((ctx) =>
					this.runUpdateLastLoginAt(ctx, id, storeId)
				);
			}
		);
	}

	private async runUpdateLastLoginAt(
		ctx: ITransactionContext,
		id: string,
		storeId: string
	): Promise<void> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		await traceDbOp(
			this.tracer,
			'db.storefrontUsers.updateLastLoginAtValue',
			{ 'db.table': 'storefront_users', 'db.operation': 'update' },
			() =>
				executor
					.update(storefrontUsers)
					.set({
						lastLoginAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(storefrontUsers.id, id),
							eq(storefrontUsers.storeId, storeId),
							isNull(storefrontUsers.deletedAt)
						)
					)
		);
	}
}
