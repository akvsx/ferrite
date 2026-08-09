import { sql } from 'drizzle-orm';
import {
	boolean,
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
import { inventoryAdjustmentTypeEnum } from './enum';
import { productVariants } from './product.schema';
import { stores } from './store.schema';
import { users } from './user.schema';

// ─────────────────────────────────────────
// WAREHOUSES
// ─────────────────────────────────────────

export const warehouses = pgTable(
	'warehouses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(),
		address: text('address'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex('uq_warehouses_store_name').on(t.storeId, t.name),
		index('idx_warehouses_store_id').on(t.storeId),
	]
);

// ─────────────────────────────────────────
// INVENTORY ITEMS (read-heavy metadata)
// ─────────────────────────────────────────

export const inventoryItems = pgTable(
	'inventory_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		variantId: uuid('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		warehouseId: uuid('warehouse_id')
			.notNull()
			.references(() => warehouses.id, { onDelete: 'cascade' }),
		batchNumber: varchar('batch_number', { length: 100 }),
		restockDate: timestamp('restock_date', { withTimezone: true }),
		expiryDate: timestamp('expiry_date', { withTimezone: true }),
		lowStockThreshold: integer('low_stock_threshold').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// One entry per variant + warehouse + batch
		unique('uq_inventory_items_variant_warehouse_batch')
			.on(t.variantId, t.warehouseId, t.batchNumber)
			.nullsNotDistinct(),
		index('idx_inventory_items_variant_id').on(t.variantId),
		index('idx_inventory_items_warehouse_id').on(t.warehouseId),
		// Restock scheduling queries
		index('idx_inventory_items_restock')
			.on(t.restockDate)
			.where(sql`restock_date IS NOT NULL`),
	]
);

// ─────────────────────────────────────────
// INVENTORY LEVELS (high-write hot table)
// Separated from inventory_items for write isolation.
// ─────────────────────────────────────────

export const inventoryLevels = pgTable(
	'inventory_levels',
	{
		inventoryItemId: uuid('inventory_item_id')
			.primaryKey()
			.references(() => inventoryItems.id, { onDelete: 'cascade' }),
		quantityOnHand: integer('quantity_on_hand').notNull().default(0),
		quantityReserved: integer('quantity_reserved').notNull().default(0),
		// Stored generated column: on_hand - reserved (Postgres 12+)
		quantityAvailable: integer('quantity_available').generatedAlwaysAs(
			sql`quantity_on_hand - quantity_reserved`
		),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		// Low-stock alert queries
		index('idx_inventory_levels_low_stock')
			.on(t.inventoryItemId, t.quantityAvailable)
			.where(sql`quantity_on_hand - quantity_reserved <= 0`),
	]
);

// ─────────────────────────────────────────
// INVENTORY ADJUSTMENTS (append-only audit log)
// ─────────────────────────────────────────

export const inventoryAdjustments = pgTable(
	'inventory_adjustments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		inventoryItemId: uuid('inventory_item_id')
			.notNull()
			.references(() => inventoryItems.id, { onDelete: 'cascade' }),
		adjustmentType: inventoryAdjustmentTypeEnum('adjustment_type').notNull(),
		quantityChange: integer('quantity_change').notNull(),
		reason: text('reason'),
		adjustedBy: uuid('adjusted_by').references(() => users.id, {
			onDelete: 'set null',
		}),
		// Immutable — no updatedAt
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index('idx_inv_adj_item_id').on(t.inventoryItemId),
		index('idx_inv_adj_created_at').on(t.createdAt),
		// Per-item history (time-ordered)
		index('idx_inv_adj_item_created').on(t.inventoryItemId, t.createdAt),
	]
);

// ─────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

export type InventoryLevel = typeof inventoryLevels.$inferSelect;
export type NewInventoryLevel = typeof inventoryLevels.$inferInsert;

export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;
