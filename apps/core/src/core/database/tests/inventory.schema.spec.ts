import { eq } from 'drizzle-orm';
import { currencies } from '../schema/currency.schema';
import {
	inventoryAdjustments,
	inventoryItems,
	inventoryLevels,
	warehouses,
} from '../schema/inventory.schema';
import { products, productVariants } from '../schema/product.schema';
import { stores } from '../schema/store.schema';
import { users } from '../schema/user.schema';
import {
	createTestCurrency,
	createTestInventoryAdjustment,
	createTestInventoryItem,
	createTestInventoryLevel,
	createTestProduct,
	createTestProductVariant,
	createTestStore,
	createTestUser,
	createTestWarehouse,
} from './helpers';
import { cleanupTables, db, setupTestDB, teardownTestDB } from './setup';

beforeAll(async () => {
	await setupTestDB();
});

afterAll(async () => {
	await teardownTestDB();
});

beforeEach(async () => {
	await cleanupTables();
	await db.insert(currencies).values(createTestCurrency());
});

async function seedVariant() {
	const [user] = await db.insert(users).values(createTestUser()).returning();
	const [store] = await db
		.insert(stores)
		.values(createTestStore(user.id))
		.returning();
	const [product] = await db
		.insert(products)
		.values(createTestProduct(store.id))
		.returning();
	const [variant] = await db
		.insert(productVariants)
		.values(createTestProductVariant(product.id))
		.returning();
	return { user, store, product, variant };
}

describe('Inventory tables', () => {
	// ─── WAREHOUSES ──────────────────────
	describe('warehouses table', () => {
		it('should insert a warehouse', async () => {
			const { store } = await seedVariant();

			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();

			expect(wh.id).toBeDefined();
			expect(wh.storeId).toBe(store.id);
			expect(wh.isActive).toBe(true);
		});

		it('should enforce unique (store_id, name)', async () => {
			const { store } = await seedVariant();

			await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id, { name: 'Main WH' }));

			try {
				await db
					.insert(warehouses)
					.values(createTestWarehouse(store.id, { name: 'Main WH' }));
				throw new Error('Should have thrown on duplicate name');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});
	});

	// ─── INVENTORY ITEMS ─────────────────
	describe('inventory_items table', () => {
		it('should insert an inventory item', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();

			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			expect(item.variantId).toBe(variant.id);
			expect(item.warehouseId).toBe(wh.id);
			expect(item.batchNumber).toMatch(/BATCH/);
		});

		it('should enforce unique (variant_id, warehouse_id, batch_number)', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();

			await db.insert(inventoryItems).values(
				createTestInventoryItem(variant.id, wh.id, {
					batchNumber: 'BATCH-DUP',
				})
			);

			try {
				await db.insert(inventoryItems).values(
					createTestInventoryItem(variant.id, wh.id, {
						batchNumber: 'BATCH-DUP',
					})
				);
				throw new Error('Should have thrown on duplicate batch');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete items when variant is deleted', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();

			await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id));

			await db
				.delete(productVariants)
				.where(eq(productVariants.id, variant.id));

			const rows = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.variantId, variant.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── INVENTORY LEVELS ────────────────
	describe('inventory_levels table', () => {
		it('should insert a level with defaults', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();
			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			const [level] = await db
				.insert(inventoryLevels)
				.values(createTestInventoryLevel(item.id))
				.returning();

			expect(level.inventoryItemId).toBe(item.id);
			expect(level.quantityOnHand).toBe(100);
			expect(level.quantityReserved).toBe(0);
		});

		it('should compute quantity_available as generated column', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();
			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			const [level] = await db
				.insert(inventoryLevels)
				.values(
					createTestInventoryLevel(item.id, {
						quantityOnHand: 50,
						quantityReserved: 15,
					})
				)
				.returning();

			expect(level.quantityAvailable).toBe(35);
		});

		it('should cascade delete level when inventory item is deleted', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();
			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			await db
				.insert(inventoryLevels)
				.values(createTestInventoryLevel(item.id));

			await db.delete(inventoryItems).where(eq(inventoryItems.id, item.id));

			const rows = await db
				.select()
				.from(inventoryLevels)
				.where(eq(inventoryLevels.inventoryItemId, item.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── INVENTORY ADJUSTMENTS ───────────
	describe('inventory_adjustments table', () => {
		it('should insert an adjustment', async () => {
			const { store, variant, user } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();
			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			const [adj] = await db
				.insert(inventoryAdjustments)
				.values(
					createTestInventoryAdjustment(item.id, {
						adjustedBy: user.id,
						reason: 'Initial stock',
					})
				)
				.returning();

			expect(adj.inventoryItemId).toBe(item.id);
			expect(adj.adjustmentType).toBe('restock');
			expect(adj.quantityChange).toBe(50);
			expect(adj.adjustedBy).toBe(user.id);
		});

		it('should cascade delete adjustments when inventory item is deleted', async () => {
			const { store, variant } = await seedVariant();
			const [wh] = await db
				.insert(warehouses)
				.values(createTestWarehouse(store.id))
				.returning();
			const [item] = await db
				.insert(inventoryItems)
				.values(createTestInventoryItem(variant.id, wh.id))
				.returning();

			await db
				.insert(inventoryAdjustments)
				.values(createTestInventoryAdjustment(item.id));

			await db.delete(inventoryItems).where(eq(inventoryItems.id, item.id));

			const rows = await db
				.select()
				.from(inventoryAdjustments)
				.where(eq(inventoryAdjustments.inventoryItemId, item.id));

			expect(rows).toHaveLength(0);
		});
	});
});
