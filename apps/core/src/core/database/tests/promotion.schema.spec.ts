import { eq } from 'drizzle-orm';
import { categories } from '../schema/category.schema';
import { currencies } from '../schema/currency.schema';
import { products, productVariants } from '../schema/product.schema';
import { promotions } from '../schema/promotion.schema';
import { stores } from '../schema/store.schema';
import { users } from '../schema/user.schema';
import {
	createTestCategory,
	createTestCurrency,
	createTestProduct,
	createTestProductVariant,
	createTestPromotion,
	createTestStore,
	createTestUser,
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

async function seedStore() {
	const [user] = await db.insert(users).values(createTestUser()).returning();
	const [store] = await db
		.insert(stores)
		.values(createTestStore(user.id))
		.returning();
	return { user, store };
}

describe('Promotions table', () => {
	it('should insert a percentage_discount promotion', async () => {
		const { store } = await seedStore();

		const [promo] = await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'percentage_discount'))
			.returning();

		expect(promo.id).toBeDefined();
		expect(promo.storeId).toBe(store.id);
		expect(promo.promotionType).toBe('percentage_discount');
		expect(promo.discountPercentage).toBe(10);
		expect(promo.isActive).toBe(true);
		// Sparse columns for other types should be null
		expect(promo.discountAmount).toBeNull();
		expect(promo.buyQuantity).toBeNull();
	});

	it('should insert a fixed_discount promotion', async () => {
		const { store } = await seedStore();

		const [promo] = await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'fixed_discount'))
			.returning();

		expect(promo.promotionType).toBe('fixed_discount');
		expect(promo.discountAmount).toBe('5.0000');
		expect(promo.discountPercentage).toBeNull();
	});

	it('should insert a buy_x_get_y promotion', async () => {
		const { store } = await seedStore();

		const [promo] = await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'buy_x_get_y'))
			.returning();

		expect(promo.promotionType).toBe('buy_x_get_y');
		expect(promo.buyQuantity).toBe(2);
		expect(promo.getQuantity).toBe(1);
	});

	it('should insert a free_shipping promotion', async () => {
		const { store } = await seedStore();

		const [promo] = await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'free_shipping'))
			.returning();

		expect(promo.promotionType).toBe('free_shipping');
		expect(promo.minimumCartValue).toBe('25.0000');
	});

	it('should insert a bundle_deal promotion', async () => {
		const { store } = await seedStore();

		const [promo] = await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'bundle_deal'))
			.returning();

		expect(promo.promotionType).toBe('bundle_deal');
		expect(promo.bundlePrice).toBe('49.9900');
	});

	it('should support target_sku_id FK', async () => {
		const { store } = await seedStore();
		const [product] = await db
			.insert(products)
			.values(createTestProduct(store.id))
			.returning();
		const [variant] = await db
			.insert(productVariants)
			.values(createTestProductVariant(product.id))
			.returning();

		const [promo] = await db
			.insert(promotions)
			.values(
				createTestPromotion(store.id, 'percentage_discount', {
					targetSkuId: variant.id,
				})
			)
			.returning();

		expect(promo.targetSkuId).toBe(variant.id);
	});

	it('should support target_category_id FK', async () => {
		const { store } = await seedStore();
		const [cat] = await db
			.insert(categories)
			.values(createTestCategory(store.id))
			.returning();

		const [promo] = await db
			.insert(promotions)
			.values(
				createTestPromotion(store.id, 'fixed_discount', {
					targetCategoryId: cat.id,
				})
			)
			.returning();

		expect(promo.targetCategoryId).toBe(cat.id);
	});

	it('should set target_sku_id to null when variant is deleted', async () => {
		const { store } = await seedStore();
		const [product] = await db
			.insert(products)
			.values(createTestProduct(store.id))
			.returning();
		const [variant] = await db
			.insert(productVariants)
			.values(createTestProductVariant(product.id))
			.returning();

		const [promo] = await db
			.insert(promotions)
			.values(
				createTestPromotion(store.id, 'percentage_discount', {
					targetSkuId: variant.id,
				})
			)
			.returning();

		await db.delete(productVariants).where(eq(productVariants.id, variant.id));

		const [updated] = await db
			.select()
			.from(promotions)
			.where(eq(promotions.id, promo.id));

		expect(updated.targetSkuId).toBeNull();
	});

	it('should set target_category_id to null when category is deleted', async () => {
		const { store } = await seedStore();
		const [cat] = await db
			.insert(categories)
			.values(createTestCategory(store.id))
			.returning();

		const [promo] = await db
			.insert(promotions)
			.values(
				createTestPromotion(store.id, 'fixed_discount', {
					targetCategoryId: cat.id,
				})
			)
			.returning();

		await db.delete(categories).where(eq(categories.id, cat.id));

		const [updated] = await db
			.select()
			.from(promotions)
			.where(eq(promotions.id, promo.id));

		expect(updated.targetCategoryId).toBeNull();
	});

	it('should cascade delete promotions when store is deleted', async () => {
		const { store } = await seedStore();

		await db
			.insert(promotions)
			.values(createTestPromotion(store.id, 'percentage_discount'));

		await db.delete(stores).where(eq(stores.id, store.id));

		const rows = await db
			.select()
			.from(promotions)
			.where(eq(promotions.storeId, store.id));

		expect(rows).toHaveLength(0);
	});
});
