import { sql } from 'drizzle-orm';
import {
	boolean,
	decimal,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { categories } from './category.schema';
import { promotionTypeEnum } from './enum';
import { productVariants } from './product.schema';
import { stores } from './store.schema';

// ─────────────────────────────────────────
// PROMOTIONS (Single Table Inheritance)
//
// Discriminator: promotion_type
// Sparse nullable columns hold type-specific parameters.
// Conditional non-nullability enforced at application layer
// via TypeScript discriminated unions + Zod validation.
// ─────────────────────────────────────────

export const promotions = pgTable(
	'promotions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),

		// ── Discriminator ────────────────────
		promotionType: promotionTypeEnum('promotion_type').notNull(),

		// ── Shared fields ────────────────────
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		isActive: boolean('is_active').notNull().default(true),
		validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
		validUntil: timestamp('valid_until', { withTimezone: true }),
		maxUsageCount: integer('max_usage_count'),
		currentUsageCount: integer('current_usage_count').notNull().default(0),

		// ── Sparse: percentage_discount ──────
		discountPercentage: integer('discount_percentage'),

		// ── Sparse: fixed_discount ───────────
		discountAmount: decimal('discount_amount', { precision: 18, scale: 4 }),

		// ── Sparse: buy_x_get_y ──────────────
		buyQuantity: integer('buy_quantity'),
		getQuantity: integer('get_quantity'),

		// ── Sparse: bundle_deal ──────────────
		bundlePrice: decimal('bundle_price', { precision: 18, scale: 4 }),

		// ── Sparse: targeting ────────────────
		minimumCartValue: decimal('minimum_cart_value', {
			precision: 18,
			scale: 4,
		}),
		targetSkuId: uuid('target_sku_id').references(() => productVariants.id, {
			onDelete: 'set null',
		}),
		targetCategoryId: uuid('target_category_id').references(
			() => categories.id,
			{ onDelete: 'set null' }
		),

		// ── Timestamps ───────────────────────
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index('idx_promotions_store_id').on(t.storeId),
		index('idx_promotions_type').on(t.promotionType),
		index('idx_promotions_target_sku').on(t.targetSkuId),
		index('idx_promotions_target_category').on(t.targetCategoryId),
		// Active promotions window query
		index('idx_promotions_active_valid')
			.on(t.storeId, t.validFrom, t.validUntil)
			.where(sql`is_active = true`),
	]
);

// ─────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────

export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
