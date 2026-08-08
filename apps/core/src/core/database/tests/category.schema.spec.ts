import { eq } from 'drizzle-orm';
import { categories, productCategories } from '../schema/category.schema';
import { currencies } from '../schema/currency.schema';
import { products } from '../schema/product.schema';
import { stores } from '../schema/store.schema';
import { users } from '../schema/user.schema';
import {
	createTestCategory,
	createTestCurrency,
	createTestProduct,
	createTestProductCategory,
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

describe('Category tables', () => {
	describe('categories table', () => {
		it('should insert a category', async () => {
			const { store } = await seedStore();

			const [cat] = await db
				.insert(categories)
				.values(createTestCategory(store.id))
				.returning();

			expect(cat.id).toBeDefined();
			expect(cat.storeId).toBe(store.id);
			expect(cat.parentId).toBeNull();
			expect(cat.isActive).toBe(true);
		});

		it('should support hierarchy via parent_id', async () => {
			const { store } = await seedStore();

			const [parent] = await db
				.insert(categories)
				.values(createTestCategory(store.id, { name: 'Electronics' }))
				.returning();

			const [child] = await db
				.insert(categories)
				.values(
					createTestCategory(store.id, {
						name: 'Phones',
						parentId: parent.id,
					})
				)
				.returning();

			expect(child.parentId).toBe(parent.id);
		});

		it('should enforce unique slug per store', async () => {
			const { store } = await seedStore();

			await db
				.insert(categories)
				.values(createTestCategory(store.id, { slug: 'electronics' }));

			try {
				await db
					.insert(categories)
					.values(createTestCategory(store.id, { slug: 'electronics' }));
				throw new Error('Should have thrown on duplicate slug');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete categories when store is deleted', async () => {
			const { store } = await seedStore();

			await db.insert(categories).values(createTestCategory(store.id));

			await db.delete(stores).where(eq(stores.id, store.id));

			const rows = await db
				.select()
				.from(categories)
				.where(eq(categories.storeId, store.id));

			expect(rows).toHaveLength(0);
		});
	});

	describe('product_categories join table', () => {
		it('should assign a product to a category', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [cat] = await db
				.insert(categories)
				.values(createTestCategory(store.id))
				.returning();

			const [pc] = await db
				.insert(productCategories)
				.values(createTestProductCategory(product.id, cat.id))
				.returning();

			expect(pc.productId).toBe(product.id);
			expect(pc.categoryId).toBe(cat.id);
		});

		it('should enforce unique (product_id, category_id)', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [cat] = await db
				.insert(categories)
				.values(createTestCategory(store.id))
				.returning();

			await db
				.insert(productCategories)
				.values(createTestProductCategory(product.id, cat.id));

			try {
				await db
					.insert(productCategories)
					.values(createTestProductCategory(product.id, cat.id));
				throw new Error('Should have thrown on duplicate assignment');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete join when product is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [cat] = await db
				.insert(categories)
				.values(createTestCategory(store.id))
				.returning();

			await db
				.insert(productCategories)
				.values(createTestProductCategory(product.id, cat.id));

			await db.delete(products).where(eq(products.id, product.id));

			const rows = await db
				.select()
				.from(productCategories)
				.where(eq(productCategories.productId, product.id));

			expect(rows).toHaveLength(0);
		});

		it('should cascade delete join when category is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [cat] = await db
				.insert(categories)
				.values(createTestCategory(store.id))
				.returning();

			await db
				.insert(productCategories)
				.values(createTestProductCategory(product.id, cat.id));

			await db.delete(categories).where(eq(categories.id, cat.id));

			const rows = await db
				.select()
				.from(productCategories)
				.where(eq(productCategories.categoryId, cat.id));

			expect(rows).toHaveLength(0);
		});
	});
});
