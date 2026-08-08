import { eq } from 'drizzle-orm';
import { currencies } from '../schema/currency.schema';
import {
	productImages,
	products,
	productVariants,
	suppliers,
	variantImages,
	variantLabels,
} from '../schema/product.schema';
import { stores } from '../schema/store.schema';
import { users } from '../schema/user.schema';
import {
	createTestCurrency,
	createTestProduct,
	createTestProductImage,
	createTestProductVariant,
	createTestStore,
	createTestSupplier,
	createTestUser,
	createTestVariantImage,
	createTestVariantLabel,
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

// ── Helper: seed a store with owner ──────
async function seedStore() {
	const [user] = await db.insert(users).values(createTestUser()).returning();
	const [store] = await db
		.insert(stores)
		.values(createTestStore(user.id))
		.returning();
	return { user, store };
}

describe('Product tables', () => {
	// ─── SUPPLIERS ───────────────────────
	describe('suppliers table', () => {
		it('should insert a supplier', async () => {
			const { store } = await seedStore();

			const [supplier] = await db
				.insert(suppliers)
				.values(createTestSupplier(store.id))
				.returning();

			expect(supplier.id).toBeDefined();
			expect(supplier.storeId).toBe(store.id);
			expect(supplier.name).toMatch(/Test Supplier/);
			expect(supplier.isActive).toBe(true);
		});

		it('should enforce unique (store_id, name)', async () => {
			const { store } = await seedStore();

			await db
				.insert(suppliers)
				.values(createTestSupplier(store.id, { name: 'Acme Corp' }));

			try {
				await db
					.insert(suppliers)
					.values(createTestSupplier(store.id, { name: 'Acme Corp' }));
				throw new Error('Should have thrown on duplicate supplier name');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete suppliers when store is deleted', async () => {
			const { store } = await seedStore();

			await db.insert(suppliers).values(createTestSupplier(store.id));
			await db.delete(stores).where(eq(stores.id, store.id));

			const rows = await db
				.select()
				.from(suppliers)
				.where(eq(suppliers.storeId, store.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── PRODUCTS ────────────────────────
	describe('products table', () => {
		it('should insert a product', async () => {
			const { store } = await seedStore();

			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			expect(product.id).toBeDefined();
			expect(product.storeId).toBe(store.id);
			expect(product.status).toBe('draft');
			expect(product.isActive).toBe(true);
		});

		it('should enforce unique slug per store', async () => {
			const { store } = await seedStore();

			await db
				.insert(products)
				.values(createTestProduct(store.id, { slug: 'cool-widget' }));

			try {
				await db
					.insert(products)
					.values(createTestProduct(store.id, { slug: 'cool-widget' }));
				throw new Error('Should have thrown on duplicate slug');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should allow same slug across different stores', async () => {
			const { user } = await seedStore();
			const [store1] = await db
				.insert(stores)
				.values(createTestStore(user.id))
				.returning();
			const [store2] = await db
				.insert(stores)
				.values(createTestStore(user.id))
				.returning();

			await db
				.insert(products)
				.values(createTestProduct(store1.id, { slug: 'same-slug' }));
			const [p2] = await db
				.insert(products)
				.values(createTestProduct(store2.id, { slug: 'same-slug' }))
				.returning();

			expect(p2.slug).toBe('same-slug');
		});

		it('should set supplier_id to null when supplier is deleted', async () => {
			const { store } = await seedStore();

			const [supplier] = await db
				.insert(suppliers)
				.values(createTestSupplier(store.id))
				.returning();

			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id, { supplierId: supplier.id }))
				.returning();

			await db.delete(suppliers).where(eq(suppliers.id, supplier.id));

			const [updated] = await db
				.select()
				.from(products)
				.where(eq(products.id, product.id));

			expect(updated.supplierId).toBeNull();
		});

		it('should cascade delete products when store is deleted', async () => {
			const { store } = await seedStore();

			await db.insert(products).values(createTestProduct(store.id));
			await db.delete(stores).where(eq(stores.id, store.id));

			const rows = await db
				.select()
				.from(products)
				.where(eq(products.storeId, store.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── PRODUCT IMAGES ──────────────────
	describe('product_images table', () => {
		it('should insert a product image', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			const [img] = await db
				.insert(productImages)
				.values(createTestProductImage(product.id))
				.returning();

			expect(img.productId).toBe(product.id);
			expect(img.url).toBeDefined();
			expect(img.sortOrder).toBe(0);
		});

		it('should cascade delete images when product is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			await db.insert(productImages).values(createTestProductImage(product.id));

			await db.delete(products).where(eq(products.id, product.id));

			const rows = await db
				.select()
				.from(productImages)
				.where(eq(productImages.productId, product.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── PRODUCT VARIANTS ────────────────
	describe('product_variants table', () => {
		it('should insert a variant with numeric price', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			expect(variant.productId).toBe(product.id);
			expect(variant.sku).toMatch(/TEST-SKU/);
			expect(variant.price).toBe('19.9900');
			expect(variant.status).toBe('active');
		});

		it('should enforce globally unique SKU', async () => {
			const { store } = await seedStore();
			const [p1] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [p2] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			await db
				.insert(productVariants)
				.values(createTestProductVariant(p1.id, { sku: 'UNIQUE-SKU-1' }));

			try {
				await db
					.insert(productVariants)
					.values(createTestProductVariant(p2.id, { sku: 'UNIQUE-SKU-1' }));
				throw new Error('Should have thrown on duplicate SKU');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete variants when product is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();

			await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id));

			await db.delete(products).where(eq(products.id, product.id));

			const rows = await db
				.select()
				.from(productVariants)
				.where(eq(productVariants.productId, product.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── VARIANT LABELS ──────────────────
	describe('variant_labels table', () => {
		it('should insert a label', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			const [label] = await db
				.insert(variantLabels)
				.values(
					createTestVariantLabel(variant.id, {
						labelName: 'Size',
						labelValue: 'XL',
					})
				)
				.returning();

			expect(label.variantId).toBe(variant.id);
			expect(label.labelName).toBe('Size');
			expect(label.labelValue).toBe('XL');
		});

		it('should enforce unique (variant_id, label_name)', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			await db
				.insert(variantLabels)
				.values(createTestVariantLabel(variant.id, { labelName: 'Color' }));

			try {
				await db
					.insert(variantLabels)
					.values(createTestVariantLabel(variant.id, { labelName: 'Color' }));
				throw new Error('Should have thrown on duplicate label name');
			} catch (e: any) {
				expect(e.cause?.code).toBe('23505');
			}
		});

		it('should cascade delete labels when variant is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			await db.insert(variantLabels).values(createTestVariantLabel(variant.id));

			await db
				.delete(productVariants)
				.where(eq(productVariants.id, variant.id));

			const rows = await db
				.select()
				.from(variantLabels)
				.where(eq(variantLabels.variantId, variant.id));

			expect(rows).toHaveLength(0);
		});
	});

	// ─── VARIANT IMAGES ──────────────────
	describe('variant_images table', () => {
		it('should insert a variant image', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			const [img] = await db
				.insert(variantImages)
				.values(createTestVariantImage(variant.id))
				.returning();

			expect(img.variantId).toBe(variant.id);
			expect(img.url).toBeDefined();
		});

		it('should cascade delete images when variant is deleted', async () => {
			const { store } = await seedStore();
			const [product] = await db
				.insert(products)
				.values(createTestProduct(store.id))
				.returning();
			const [variant] = await db
				.insert(productVariants)
				.values(createTestProductVariant(product.id))
				.returning();

			await db.insert(variantImages).values(createTestVariantImage(variant.id));

			await db
				.delete(productVariants)
				.where(eq(productVariants.id, variant.id));

			const rows = await db
				.select()
				.from(variantImages)
				.where(eq(variantImages.variantId, variant.id));

			expect(rows).toHaveLength(0);
		});
	});
});
