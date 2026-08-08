import { eq } from 'drizzle-orm';
import { currencies } from '../schema/currency.schema';
import { stores } from '../schema/store.schema';
import { storefrontUsers } from '../schema/storefront-user.schema';
import { users } from '../schema/user.schema';
import {
	createTestCurrency,
	createTestStore,
	createTestStorefrontUser,
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
});

describe('storefront_users table', () => {
	it('should insert a storefront user with only required fields and apply defaults', async () => {
		const [user] = await db.insert(users).values(createTestUser()).returning();
		await db
			.insert(currencies)
			.values(createTestCurrency())
			.onConflictDoNothing();
		const [store] = await db
			.insert(stores)
			.values(createTestStore(user.id))
			.returning();

		const [sfUser] = await db
			.insert(storefrontUsers)
			.values(createTestStorefrontUser(store.id))
			.returning();

		expect(sfUser.id).toBeDefined();
		expect(sfUser.storeId).toBe(store.id);
		expect(sfUser.email).toBeDefined();
		expect(sfUser.emailVerifiedAt).toBeNull();
		expect(sfUser.metadata).toEqual({});
		expect(sfUser.createdAt).toBeInstanceOf(Date);
		expect(sfUser.updatedAt).toBeInstanceOf(Date);
	});

	it('should reject duplicate email within the same store', async () => {
		const [user] = await db.insert(users).values(createTestUser()).returning();
		await db
			.insert(currencies)
			.values(createTestCurrency())
			.onConflictDoNothing();
		const [store] = await db
			.insert(stores)
			.values(createTestStore(user.id))
			.returning();

		const email = `dup-${Date.now()}@example.com`;
		await db
			.insert(storefrontUsers)
			.values(createTestStorefrontUser(store.id, { email }));

		let caughtError: any;
		try {
			await db
				.insert(storefrontUsers)
				.values(createTestStorefrontUser(store.id, { email }));
		} catch (e) {
			caughtError = e;
		}
		expect(caughtError?.cause?.code).toBe('23505');
	});

	it('should allow the same email across different stores', async () => {
		const [user] = await db.insert(users).values(createTestUser()).returning();
		await db
			.insert(currencies)
			.values(createTestCurrency())
			.onConflictDoNothing();
		const [store1] = await db
			.insert(stores)
			.values(createTestStore(user.id))
			.returning();
		const [store2] = await db
			.insert(stores)
			.values(createTestStore(user.id))
			.returning();

		const email = `multi-store-${Date.now()}@example.com`;
		await db
			.insert(storefrontUsers)
			.values(createTestStorefrontUser(store1.id, { email }));

		// Should not throw
		const [sfUser2] = await db
			.insert(storefrontUsers)
			.values(createTestStorefrontUser(store2.id, { email }))
			.returning();

		expect(sfUser2.email).toBe(email);
		expect(sfUser2.storeId).toBe(store2.id);
	});

	it('should cascade delete when the store is deleted', async () => {
		const [user] = await db.insert(users).values(createTestUser()).returning();
		await db
			.insert(currencies)
			.values(createTestCurrency())
			.onConflictDoNothing();
		const [store] = await db
			.insert(stores)
			.values(createTestStore(user.id))
			.returning();

		const [sfUser] = await db
			.insert(storefrontUsers)
			.values(createTestStorefrontUser(store.id))
			.returning();

		// Delete the store
		await db.delete(stores).where(eq(stores.id, store.id));

		const sfUsers = await db
			.select()
			.from(storefrontUsers)
			.where(eq(storefrontUsers.id, sfUser.id));

		expect(sfUsers).toHaveLength(0);
	});
});
