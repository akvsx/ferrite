import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { stores } from './store.schema';

export const storefrontUsers = pgTable(
	'storefront_users',
	{
		id: uuid('id').primaryKey(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),

		// Identity
		email: varchar('email', { length: 255 }).notNull(),
		emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }), // NULL = unverified

		// Auth credentials
		passwordHash: varchar('password_hash', { length: 255 }), // NULL for SSO-only accounts
		mfaSecret: varchar('mfa_secret', { length: 255 }), // Encrypted TOTP secret
		mfaEnabled: boolean('mfa_enabled').notNull().default(false),
		mfaRecoveryCodes: text('mfa_recovery_codes').array(), // Encrypted backup codes

		// Brute-force / lockout
		failedLoginCount: smallint('failed_login_count').notNull().default(0),
		lockedUntil: timestamp('locked_until', { withTimezone: true }), // NULL = not locked

		// Profile
		displayName: varchar('display_name', { length: 200 }),
		metadata: jsonb('metadata').default({}),
		lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		bannedAt: timestamp('banned_at', { withTimezone: true }),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(t) => [
		uniqueIndex('uq_storefront_users_store_email')
			.on(t.storeId, sql`lower(${t.email})`)
			.where(sql`${t.deletedAt} is null`),
		index('idx_storefront_users_store_id').on(t.storeId),
		index('idx_storefront_users_email').on(sql`lower(${t.email})`),
		index('idx_storefront_users_store_created_at').on(t.storeId, t.createdAt),
	]
);

export const storefrontOauthAccounts = pgTable(
	'storefront_oauth_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => storefrontUsers.id, { onDelete: 'cascade' }),
		provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'apple' | 'github'
		providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Prevents the same external account from being linked twice within a store
		unique('uq_oauth_store_provider_user').on(
			t.storeId,
			t.provider,
			t.providerUserId
		),
		// Reverse lookup: all providers linked to a given user
		index('idx_oauth_accounts_user_id').on(t.userId),
	]
);

export const storefrontPasswordResets = pgTable(
	'storefront_password_resets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id').notNull(), // no FK — intentional
		userId: uuid('user_id')
			.notNull()
			.references(() => storefrontUsers.id, { onDelete: 'cascade' }),
		tokenHash: varchar('token_hash', { length: 255 }).notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		usedAt: timestamp('used_at', { withTimezone: true }), // NULL = unused
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Primary lookup: verify an inbound token
		index('idx_password_resets_token_hash').on(t.tokenHash),
		// Check for an existing pending reset before issuing a new one
		index('idx_password_resets_user_id').on(t.userId),
		// Batch expiry cleanup: DELETE WHERE expires_at < NOW()
		index('idx_password_resets_expires_at').on(t.expiresAt),
	]
);

export const storefrontEmailVerifications = pgTable(
	'storefront_email_verifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id').notNull(), // no FK — intentional
		userId: uuid('user_id')
			.notNull()
			.references(() => storefrontUsers.id, { onDelete: 'cascade' }),
		tokenHash: varchar('token_hash', { length: 255 }).notNull(), // SHA-256 of raw token
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Primary lookup: verify an inbound token (also checks expiry)
		index('idx_email_verifications_user_id').on(t.userId),
		// Batch expiry cleanup
		index('idx_email_verifications_expires_at').on(t.expiresAt),
	]
);

export type StorefrontUserTable = typeof storefrontUsers.$inferSelect;
export type NewStorefrontUserTable = typeof storefrontUsers.$inferInsert;

export type StorefrontOauthAccountTable =
	typeof storefrontOauthAccounts.$inferSelect;
export type NewStorefrontOauthAccountTable =
	typeof storefrontOauthAccounts.$inferInsert;

export type StorefrontEmailVerificationTable =
	typeof storefrontEmailVerifications.$inferSelect;
export type NewStorefrontEmailVerificationTable =
	typeof storefrontEmailVerifications.$inferInsert;
