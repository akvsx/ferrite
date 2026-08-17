import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { products } from './product.schema';
import { stores } from './store.schema';

// ─────────────────────────────────────────
// CATEGORIES (self-referencing hierarchy)
// ─────────────────────────────────────────

export const categories = pgTable(
	'categories',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		parentId: uuid('parent_id'),
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 255 }).notNull(),
		description: text('description'),
		sortOrder: integer('sort_order').notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Slug unique per store
		uniqueIndex('uq_categories_store_slug').on(t.storeId, t.slug),
		index('idx_categories_store_id').on(t.storeId),
		index('idx_categories_parent_id').on(t.parentId),
		index('idx_categories_store_created_at').on(t.storeId, t.createdAt, t.id),
	]
);

// ─────────────────────────────────────────
// PRODUCT ↔ CATEGORY (M:N join)
// ─────────────────────────────────────────

export const productCategories = pgTable(
	'product_categories',
	{
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' }),
		assignedAt: timestamp('assigned_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.productId, t.categoryId] })]
);

// ─────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
