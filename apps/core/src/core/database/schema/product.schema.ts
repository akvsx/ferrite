import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	decimal,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { productStatusEnum, variantStatusEnum } from './enum';
import { stores } from './store.schema';

// ─────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────

export const suppliers = pgTable(
	'suppliers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		contactEmail: varchar('contact_email', { length: 255 }),
		contactPhone: varchar('contact_phone', { length: 50 }),
		address: text('address'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(t) => [
		index('idx_suppliers_store_id').on(t.storeId),
		unique('uq_suppliers_store_name').on(t.storeId, t.name),
	]
);

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────

export const products = pgTable(
	'products',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		supplierId: uuid('supplier_id').references(() => suppliers.id, {
			onDelete: 'set null',
		}),
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 255 }).notNull(),
		description: text('description'),
		status: productStatusEnum('status').notNull().default('draft'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(t) => [
		// Slug unique per store
		uniqueIndex('uq_products_store_slug').on(t.storeId, t.slug),
		index('idx_products_store_id').on(t.storeId),
		index('idx_products_supplier_id').on(t.supplierId),
		// Active, non-deleted products (listing page)
		index('idx_products_active')
			.on(t.storeId, t.createdAt)
			.where(sql`status = 'active' AND deleted_at IS NULL`),
	]
);

// ─────────────────────────────────────────
// PRODUCT IMAGES
// ─────────────────────────────────────────

export const productImages = pgTable(
	'product_images',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		url: varchar('url', { length: 2048 }).notNull(),
		altText: varchar('alt_text', { length: 255 }),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index('idx_product_images_product_id').on(t.productId)]
);

// ─────────────────────────────────────────
// PRODUCT VARIANTS
// ─────────────────────────────────────────

export const productVariants = pgTable(
	'product_variants',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		sku: varchar('sku', { length: 100 }).notNull(),
		name: varchar('name', { length: 255 }),
		// Prices stored as numeric to support multi-currency decimal precision
		price: decimal('price', { precision: 18, scale: 4 }).notNull(),
		compareAtPrice: decimal('compare_at_price', { precision: 18, scale: 4 }),
		costPrice: decimal('cost_price', { precision: 18, scale: 4 }),
		thumbnailUrl: varchar('thumbnail_url', { length: 2048 }),
		status: variantStatusEnum('status').notNull().default('active'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Globally unique SKU
		uniqueIndex('uq_product_variants_sku').on(t.sku),
		index('idx_product_variants_product_id').on(t.productId),
		// Price invariants
		check('chk_product_variants_price_positive', sql`${t.price} >= 0`),
		check(
			'chk_product_variants_cost_price_positive',
			sql`${t.costPrice} IS NULL OR ${t.costPrice} >= 0`
		),
	]
);

// ─────────────────────────────────────────
// VARIANT LABELS (attribute key-value pairs)
// ─────────────────────────────────────────

export const variantLabels = pgTable(
	'variant_labels',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		variantId: uuid('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		labelName: varchar('label_name', { length: 100 }).notNull(),
		labelValue: varchar('label_value', { length: 255 }).notNull(),
	},
	(t) => [
		// One value per label per variant
		unique('uq_variant_labels_variant_name').on(t.variantId, t.labelName),
		index('idx_variant_labels_variant_id').on(t.variantId),
	]
);

// ─────────────────────────────────────────
// VARIANT IMAGES
// ─────────────────────────────────────────

export const variantImages = pgTable(
	'variant_images',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		variantId: uuid('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		url: varchar('url', { length: 2048 }).notNull(),
		altText: varchar('alt_text', { length: 255 }),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index('idx_variant_images_variant_id').on(t.variantId)]
);

// ─────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type VariantLabel = typeof variantLabels.$inferSelect;
export type NewVariantLabel = typeof variantLabels.$inferInsert;

export type VariantImage = typeof variantImages.$inferSelect;
export type NewVariantImage = typeof variantImages.$inferInsert;
