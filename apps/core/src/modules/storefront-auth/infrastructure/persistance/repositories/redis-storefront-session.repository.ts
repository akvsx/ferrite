import { randomBytes } from 'node:crypto';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	NewStorefrontSession,
	StorefrontSession,
} from '@ferrite/schema/storefront-auth/session.zodschema';
import { storefrontSessionSchema } from '@ferrite/schema/storefront-auth/session.zodschema';
import type { IStorefrontSessionRepository } from '@modules/storefront-auth/domain/ports/storefront-session-repository.port';
import { STOREFRONT_REDIS } from '@modules/storefront-auth/infrastructure/redis/redis.provider';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis key for an individual session hash */
const sessionKey = (id: string) => `sf:session:${id}`;

/** Redis key for the set of a user's active sessions within a store */
const userSessionsKey = (storeId: string, userId: string) =>
	`sf:sessions:${storeId}:${userId}`;

@Injectable()
export class RedisStorefrontSessionRepository
	implements IStorefrontSessionRepository
{
	private readonly idleLifetimeMs: number;
	private readonly absoluteLifetimeMs: number;
	private readonly renewalThresholdMs: number;

	constructor(
		private readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		@Inject(STOREFRONT_REDIS) private readonly redis: Redis,
		config: ConfigService
	) {
		this.logger.setContext(this.constructor.name);

		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		const sessionConfig = ferriteConfig.storefrontAuth.session;

		this.idleLifetimeMs = sessionConfig.idleLifetimeMs;
		this.absoluteLifetimeMs = sessionConfig.absoluteLifetimeMs;
		this.renewalThresholdMs = Math.floor(
			sessionConfig.idleLifetimeMs * sessionConfig.renewalThreshold
		);
	}

	async create(input: NewStorefrontSession): Promise<StorefrontSession> {
		return this.tracer.withSpan('storefront_auth.session.create', async () => {
			const id = randomBytes(20).toString('hex');
			const createdAt = new Date().toISOString();

			const sessionData: Record<string, string> = {
				storeId: input.storeId,
				userId: input.userId,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
				countryCode: input.countryCode ?? '',
				createdAt,
			};

			const sKey = sessionKey(id);
			const uKey = userSessionsKey(input.storeId, input.userId);

			const pipeline = this.redis.pipeline();
			pipeline.hset(sKey, sessionData);
			pipeline.pexpire(sKey, this.idleLifetimeMs);
			pipeline.sadd(uKey, id);
			// The user-sessions set TTL matches the absolute lifetime
			pipeline.pexpire(uKey, this.absoluteLifetimeMs);
			await pipeline.exec();

			this.logger.debug(
				`Session created: sessionId=${id}, userId=${input.userId}`
			);

			return storefrontSessionSchema.parse({
				id,
				...sessionData,
			});
		});
	}

	async findByIdAndStoreId(
		id: string,
		storeId: string
	): Promise<StorefrontSession | null> {
		return this.tracer.withSpan(
			'storefront_auth.session.findByIdAndStoreId',
			async () => {
				const data = await this.redis.hgetall(sessionKey(id));

				// hgetall returns {} for missing keys
				if (!data || Object.keys(data).length === 0) {
					return null;
				}

				// Tenant isolation: verify storeId matches
				if (data.storeId !== storeId) {
					this.logger.warn(
						`Session storeId mismatch — possible cookie injection: sessionId=${id}`
					);
					return null;
				}

				return storefrontSessionSchema.parse({ id, ...data });
			}
		);
	}

	async renewIfNeeded(sessionId: string): Promise<void> {
		return this.tracer.withSpan('storefront_auth.session.renew', async () => {
			const ttl = await this.redis.pttl(sessionKey(sessionId));
			if (ttl > 0 && ttl < this.renewalThresholdMs) {
				await this.redis.pexpire(sessionKey(sessionId), this.idleLifetimeMs);
				this.logger.debug(`Session TTL renewed: sessionId=${sessionId}`);
			}
		});
	}

	checkAbsoluteExpiry(session: StorefrontSession): boolean {
		const createdAt = new Date(session.createdAt).getTime();
		return Date.now() - createdAt > this.absoluteLifetimeMs;
	}

	async deleteById(id: string): Promise<boolean> {
		return this.tracer.withSpan('storefront_auth.session.delete', async () => {
			// Read userId + storeId before deleting so we can SREM from the set
			const data = await this.redis.hmget(sessionKey(id), 'userId', 'storeId');

			if (!data || Object.keys(data).length === 0) return false;

			const [userId, storeId] = data;

			const pipeline = this.redis.pipeline();
			pipeline.del(sessionKey(id));

			if (userId && storeId) {
				pipeline.srem(userSessionsKey(storeId, userId), id);
			}

			await pipeline.exec();
			this.logger.debug(`Session deleted: sessionId=${id}`);
			return true;
		});
	}

	async deleteAllByUserId(userId: string, storeId: string): Promise<boolean> {
		return this.tracer.withSpan(
			'storefront_auth.session.deleteAll',
			async () => {
				const uKey = userSessionsKey(storeId, userId);
				const sessionIds = await this.redis.smembers(uKey);

				if (sessionIds.length === 0) return false;

				const pipeline = this.redis.pipeline();
				for (const sid of sessionIds) {
					pipeline.del(sessionKey(sid));
				}
				pipeline.del(uKey);
				await pipeline.exec();

				this.logger.debug(
					`All sessions deleted: userId=${userId}, count=${sessionIds.length}`
				);

				return true;
			}
		);
	}

	async findAllByUserIdAndStoreId(
		userId: string,
		storeId: string
	): Promise<StorefrontSession[]> {
		return this.tracer.withSpan('storefront_auth.session.findAll', async () => {
			const uKey = userSessionsKey(storeId, userId);
			const sessionIds = await this.redis.smembers(uKey);

			if (sessionIds.length === 0) return [];

			const pipeline = this.redis.pipeline();
			for (const sid of sessionIds) {
				pipeline.hgetall(sessionKey(sid));
			}

			const results = await pipeline.exec();
			if (!results) return [];

			const sessions: StorefrontSession[] = [];

			for (let i = 0; i < sessionIds.length; i++) {
				const [err, data] = results[i];
				if (err) {
					this.logger.error(
						`Error fetching session ${sessionIds[i]}`,
						String(err)
					);
					continue;
				}

				// data can be an empty object if the hash doesn't exist (e.g. it expired but hasn't been cleaned from the set yet)
				if (!data || Object.keys(data as object).length === 0) {
					continue;
				}

				const record = data as Record<string, string>;

				// Double-check tenant isolation just in case
				if (record.storeId !== storeId) {
					continue;
				}

				try {
					const session = storefrontSessionSchema.parse({
						id: sessionIds[i],
						...record,
					});
					sessions.push(session);
				} catch (e) {
					this.logger.error(
						`Invalid session data for ${sessionIds[i]}`,
						String(e)
					);
				}
			}

			return sessions;
		});
	}
}
