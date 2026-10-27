/**
 * Deterministic seed-data builders for every table in
 * `src/core/database/schema`.
 *
 * Pure functions only — no DB access here. `buildSeedData()` returns the
 * tables in FK-safe insert order. Run `bun dev/seed.ts --dry-run` to
 * validate counts and uniqueness constraints without a database.
 *
 * Data is generated programmatically from a seeded PRNG (mulberry32), so
 * every run produces the same dataset. Primary keys are deterministic
 * UUIDs derived from (table-tag, index).
 */

import { STORE_PERMISSIONS } from '@ferrite/schema/common/permissions.zodschema';
import type * as schema from '../src/core/database/schema';

// ─────────────────────────────────────────
// Deterministic primitives
// ─────────────────────────────────────────

/** Number of rows per table. Override with `SEED_N=100 bun dev/seed.ts`. */
export const N = Number(process.env.SEED_N ?? 500);
/** Exactly one owner user and five stores, as requested. */
export const STORE_COUNT = 5;

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(42);

function hash32(str: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	}
	return h >>> 0;
}

/** Deterministic UUID v4 from a tag + index. Unique per (tag, n). */
export function deterministicUuid(tag: string, n: number): string {
	let x = (hash32(`${tag}:${n}`) ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
	const words: number[] = [];
	for (let k = 0; k < 4; k++) {
		x ^= (x << 13) >>> 0;
		x >>>= 0;
		x ^= x >>> 17;
		x ^= (x << 5) >>> 0;
		x >>>= 0;
		words.push(x >>> 0);
	}
	const chars = words
		.map((w) => w.toString(16).padStart(8, '0'))
		.join('')
		.split('');
	chars[12] = '4';
	chars[16] = (['8', '9', 'a', 'b'] as const)[words[0]! % 4]!;
	const s = chars.join('');
	return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

function pick<T>(arr: readonly T[], i: number): T {
	return arr[i % arr.length]!;
}

function int(min: number, max: number): number {
	return min + Math.floor(rand() * (max - min + 1));
}

function money(min: number, max: number): string {
	return (min + rand() * (max - min)).toFixed(4);
}

function daysFromNow(days: number): Date {
	return new Date(ANCHORED_NOW_MS + days * 86_400_000);
}

/**
 * Fixed timestamp anchor so every run generates byte-identical data
 * (DB `defaultNow()` columns aside). Do not use `Date.now()` in builders.
 */
const ANCHORED_NOW_MS = Date.parse('2026-06-01T12:00:00.000Z');

function now(): Date {
	return new Date(ANCHORED_NOW_MS);
}

// ─────────────────────────────────────────
// Word pools (programmatic variety)
// ─────────────────────────────────────────

const FIRST = [
	'Aarav', 'Maya', 'Liam', 'Sofia', 'Noah', 'Priya', 'Kenji', 'Amara',
	'Lucas', 'Zara', 'Omar', 'Elena', 'Ravi', 'Nina', 'Diego', 'Hana',
	'Felix', 'Iris', 'Arjun', 'Lena',
] as const;
const LAST = [
	'Sharma', 'Garcia', 'Kim', 'Nguyen', 'Patel', 'Muller', 'Rossi',
	'Khan', 'Silva', 'Novak', 'Haddad', 'Tanaka', 'Okafor', 'Larsen',
	'Moreau', 'Petrov', 'Adeyemi', 'Kowalski', 'Rahman', 'Costa',
] as const;
const CITY = [
	'Austin', 'Bengaluru', 'Berlin', 'Toronto', 'Osaka', 'Lagos',
	'Madrid', 'Mumbai', 'Denver', 'Lyon', 'Chennai', 'Seattle',
] as const;
const STREET = [
	'Oak Ave', 'Maple St', 'Cedar Blvd', 'Pine Rd', 'Elm Way',
	'Birch Ln', 'Willow Dr', 'Aspen Ct',
] as const;
const COUNTRY = ['US', 'IN', 'GB', 'DE', 'CA'] as const;
const ADJ = [
	'Urban', 'Classic', 'Premium', 'Eco', 'Sport', 'Vintage', 'Modern',
	'Deluxe', 'Compact', 'Studio', 'Artisan', 'Essential', 'Prime',
	'Nova', 'Alpha', 'Summit',
] as const;
const NOUN = [
	'Backpack', 'Sneakers', 'Lamp', 'Mug', 'Jacket', 'Watch', 'Chair',
	'Headphones', 'Wallet', 'Bottle', 'Keyboard', 'Plant Pot', 'Towel',
	'Speaker', 'Notebook', 'Sunglasses',
] as const;
const COLOR = [
	'Red', 'Blue', 'Green', 'Black', 'White', 'Sand', 'Navy', 'Olive',
] as const;
const SIZE = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const MATERIAL = [
	'Cotton', 'Leather', 'Steel', 'Ceramic', 'Polyester', 'Wood',
] as const;
const LABEL_NAMES = ['Color', 'Size', 'Material', 'Style'] as const;

const REAL_CURRENCIES: Array<{
	code: string;
	symbol: string;
	decimalPrecision: number;
}> = [
	{ code: 'USD', symbol: '$', decimalPrecision: 2 },
	{ code: 'EUR', symbol: '€', decimalPrecision: 2 },
	{ code: 'GBP', symbol: '£', decimalPrecision: 2 },
	{ code: 'JPY', symbol: '¥', decimalPrecision: 0 },
	{ code: 'INR', symbol: '₹', decimalPrecision: 2 },
	{ code: 'CAD', symbol: '$', decimalPrecision: 2 },
	{ code: 'AUD', symbol: '$', decimalPrecision: 2 },
	{ code: 'CHF', symbol: 'Fr', decimalPrecision: 2 },
	{ code: 'CNY', symbol: '¥', decimalPrecision: 2 },
	{ code: 'SEK', symbol: 'kr', decimalPrecision: 2 },
	{ code: 'NZD', symbol: '$', decimalPrecision: 2 },
	{ code: 'MXN', symbol: '$', decimalPrecision: 2 },
	{ code: 'SGD', symbol: '$', decimalPrecision: 2 },
	{ code: 'HKD', symbol: '$', decimalPrecision: 2 },
	{ code: 'NOK', symbol: 'kr', decimalPrecision: 2 },
	{ code: 'KRW', symbol: '₩', decimalPrecision: 0 },
	{ code: 'BRL', symbol: 'R$', decimalPrecision: 2 },
	{ code: 'ZAR', symbol: 'R', decimalPrecision: 2 },
	{ code: 'AED', symbol: 'د.إ', decimalPrecision: 2 },
	{ code: 'THB', symbol: '฿', decimalPrecision: 2 },
	{ code: 'PHP', symbol: '₱', decimalPrecision: 2 },
	{ code: 'IDR', symbol: 'Rp', decimalPrecision: 0 },
	{ code: 'MYR', symbol: 'RM', decimalPrecision: 2 },
	{ code: 'VND', symbol: '₫', decimalPrecision: 0 },
	{ code: 'PLN', symbol: 'zł', decimalPrecision: 2 },
	{ code: 'CZK', symbol: 'Kč', decimalPrecision: 2 },
	{ code: 'DKK', symbol: 'kr', decimalPrecision: 2 },
	{ code: 'HUF', symbol: 'Ft', decimalPrecision: 0 },
	{ code: 'ILS', symbol: '₪', decimalPrecision: 2 },
	{ code: 'TRY', symbol: '₺', decimalPrecision: 2 },
];

const NOTIF_CHANNELS = ['email', 'sms', 'push', 'whatsapp'] as const;
const NOTIF_TYPES = [
	'order_updates',
	'promotions',
	'restock',
	'price_drop',
	'support',
	'security',
] as const;
const PROMO_TYPES = [
	'percentage_discount',
	'fixed_discount',
	'buy_x_get_y',
	'free_shipping',
	'bundle_deal',
] as const;
const ADJ_TYPES = [
	'restock',
	'sale',
	'return',
	'correction',
	'damage',
	'transfer',
] as const;
const INVITE_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const;
const PRODUCT_STATUSES = [
	'active',
	'active',
	'active',
	'draft',
	'archived',
] as const;
const VARIANT_STATUSES = ['active', 'active', 'active', 'inactive', 'discontinued'] as const;
const OAUTH_PROVIDERS = ['google', 'apple', 'github'] as const;

// ─────────────────────────────────────────
// Seed assembly (FK-safe order)
// ─────────────────────────────────────────

export interface SeedTable {
	name: string;
	rows: Record<string, unknown>[];
	expected: number;
	/** Why this table gets fewer than N rows (hard DB constraint). */
	capped?: string;
}

export function buildSeedData(): SeedTable[] {
	if (N % STORE_COUNT !== 0) {
		throw new Error(`SEED_N (${N}) must be divisible by ${STORE_COUNT}`);
	}
	const tables: SeedTable[] = [];

	// ── currencies (up to 30 real + synthetic Q-codes to reach N) ──
	const realPart = REAL_CURRENCIES.slice(0, Math.min(REAL_CURRENCIES.length, Math.max(N, 5)));
	const currencyCodes: string[] = realPart.map((c) => c.code);
	{
		const rows: Array<typeof schema.currencies.$inferInsert> = realPart.map(
			(c) => ({ ...c, isActive: true }),
		);
		let i = 0;
		while (rows.length < N) {
			const code = `Q${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`;
			i++;
			if (currencyCodes.includes(code)) continue;
			currencyCodes.push(code);
			rows.push({
				code,
				symbol: '¤',
				decimalPrecision: pick([0, 2, 2, 2, 3] as const, rows.length),
				isActive: rows.length % 25 !== 0,
			});
		}
		tables.push({ name: 'currencies', rows, expected: rows.length });
	}

	// ── users (1 owner) ──
	const ownerId = deterministicUuid('user', 0);
	{
		const rows: Array<typeof schema.users.$inferInsert> = [
			{
				id: ownerId,
				email: 'dev.owner@seed.example.com',
				emailVerified: true,
				firstName: 'Dev',
				lastName: 'Owner',
				preferredLocale: 'en-US',
				preferredCurrency: 'USD',
				platformRole: 'admin',
				lastLoginAt: now(),
			},
		];
		tables.push({
			name: 'users',
			rows,
			expected: 1,
			capped: 'requested: exactly 1 owner user',
		});
	}

	// ── user_phones (N; exactly one default per user) ──
	{
		const rows: Array<typeof schema.userPhones.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => ({
				userId: ownerId,
				phone: `555${String(1_000_000 + i).slice(1)}`,
				countryCode: '+1',
				phoneVerified: i % 3 !== 0,
				isDefault: i === 0,
			}),
		);
		tables.push({ name: 'user_phones', rows, expected: N });
	}

	// ── user_addresses (N; exactly one primary per user) ──
	{
		const rows: Array<typeof schema.userAddresses.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => ({
				userId: ownerId,
				label: i === 0 ? 'Home' : `Address ${i}`,
				type: pick(['home', 'work', 'other'] as const, i),
				firstName: pick(FIRST, i),
				lastName: pick(LAST, i),
				phone: `555${String(2_000_000 + i).slice(1)}`,
				countryCode: '+1',
				line1: `${100 + i} ${pick(STREET, i)}`,
				city: pick(CITY, i),
				state: pick(CITY, i + 3),
				postalCode: `${10_000 + i}`,
				country: pick(COUNTRY, i),
				isPrimary: i === 0,
			}),
		);
		tables.push({ name: 'user_addresses', rows, expected: N });
	}

	// ── user_auth_providers (1: provider enum has a single value + unique per user) ──
	{
		const rows = [
			{
				userId: ownerId,
				provider: 'clerk' as const,
				externalAuthId: 'clerk_seed_owner_001',
			},
		];
		tables.push({
			name: 'user_auth_providers',
			rows,
			expected: 1,
			capped:
				"auth_provider enum = ['clerk'] only and unique(user_id, provider): max 1 row for 1 user",
		});
	}

	// ── user_payment_methods (N; exactly one default per user) ──
	{
		const rows: Array<typeof schema.userPaymentMethods.$inferInsert> =
			Array.from({ length: N }, (_, i) => ({
				userId: ownerId,
				provider: pick(['stripe', 'paypal'] as const, i),
				providerPaymentMethodId: `pm_seed_${String(i).padStart(5, '0')}`,
				cardLast4: String(1000 + ((i * 7) % 9000)),
				cardBrand: pick(['visa', 'mastercard'] as const, i),
				expiresAt: `${2027 + (i % 4)}-${String(1 + (i % 12)).padStart(2, '0')}-01`,
				isDefault: i === 0,
			}));
		tables.push({ name: 'user_payment_methods', rows, expected: N });
	}

	// ── user_notification_preferences (24: PK is user×channel×type) ──
	{
		const rows: Array<typeof schema.userNotificationPreferences.$inferInsert> =
			[];
		for (const channel of NOTIF_CHANNELS) {
			for (const type of NOTIF_TYPES) {
				rows.push({
					userId: ownerId,
					channel,
					type,
					isEnabled: !(channel === 'sms' && type === 'promotions'),
				});
			}
		}
		tables.push({
			name: 'user_notification_preferences',
			rows,
			expected: NOTIF_CHANNELS.length * NOTIF_TYPES.length,
			capped: 'composite PK (user_id, channel, type): 4 channels × 6 types = 24 max for 1 user',
		});
	}

	// ── user_onboarding (1: PK is user_id) ──
	{
		const rows: Array<typeof schema.userOnboarding.$inferInsert> = [
			{
				userId: ownerId,
				state: 'COMPLETED',
				isCompleted: true,
				stepData: { seed: true, storesCreated: STORE_COUNT },
				completedAt: now(),
			},
		];
		tables.push({
			name: 'user_onboarding',
			rows,
			expected: 1,
			capped: 'PK is user_id: max 1 row for 1 user',
		});
	}

	// ── exchange_rates (N directed pairs, from ≠ to) ──
	{
		const rows: Array<typeof schema.exchangeRates.$inferInsert> = [];
		outer: for (const from of currencyCodes) {
			for (const to of currencyCodes) {
				if (from === to) continue;
				rows.push({
					fromCurrencyCode: from,
					toCurrencyCode: to,
					rate: (0.01 + rand() * 1.5).toFixed(9),
				});
				if (rows.length >= N) break outer;
			}
		}
		tables.push({ name: 'exchange_rates', rows, expected: N });
	}

	// ── stores (5) ──
	const storeIds = Array.from({ length: STORE_COUNT }, (_, i) =>
		deterministicUuid('store', i),
	);
	const storeCurrency = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
	{
		const names = [
			'Seed Emporium',
			'Northwind Traders',
			'Acme Marketplace',
			'Bluebird Goods',
			'Foxglove & Co',
		];
		const rows: Array<typeof schema.stores.$inferInsert> = storeIds.map(
			(id, i) => ({
				id,
				name: names[i]!,
				slug: `seed-store-${i}`,
				description: `Seed store ${i} for local development`,
				currencyCode: storeCurrency[i]!,
				createdBy: ownerId,
				isActive: true,
			}),
		);
		tables.push({
			name: 'stores',
			rows,
			expected: STORE_COUNT,
			capped: 'requested: exactly 5 stores',
		});
	}

	// ── store_roles (N: 100/store; first per store is system Admin) ──
	const perStore = N / STORE_COUNT;
	const roleIds: string[] = [];
	{
		const rows: Array<typeof schema.storeRoles.$inferInsert> = [];
		const titles = ['Manager', 'Editor', 'Support', 'Viewer', 'Analyst'];
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const id = deterministicUuid('store-role', s * perStore + j);
				roleIds.push(id);
				rows.push({
					id,
					storeId: storeIds[s]!,
					name: j === 0 ? 'Admin' : `${titles[j % titles.length]} ${j}`,
					description: j === 0 ? 'System administrator role' : `Seed role ${j} of store ${s}`,
					isSystem: j === 0,
				});
			}
		}
		tables.push({ name: 'store_roles', rows, expected: N });
	}

	// ── store_role_permissions (N: one key per role, cycling all keys) ──
	{
		const rows: Array<typeof schema.storeRolePermissions.$inferInsert> =
			roleIds.map((roleId, i) => ({
				storeRoleId: roleId,
				permissionKey: STORE_PERMISSIONS[i % STORE_PERMISSIONS.length]!,
			}));
		tables.push({ name: 'store_role_permissions', rows, expected: N });
	}

	// ── store_members (5: PK is store×user; one owner per store) ──
	{
		const rows: Array<typeof schema.storeMembers.$inferInsert> = storeIds.map(
			(storeId, s) => ({
				storeId,
				userId: ownerId,
				roleId: roleIds[s * perStore]!,
				isOwner: true,
			}),
		);
		tables.push({
			name: 'store_members',
			rows,
			expected: STORE_COUNT,
			capped: 'composite PK (store_id, user_id): max 5 rows for 1 user × 5 stores',
		});
	}

	// ── store_invitations (N) ──
	{
		const rows: Array<typeof schema.storeInvitations.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => {
				const s = i % STORE_COUNT;
				return {
					storeId: storeIds[s]!,
					email: `invite-${String(i).padStart(4, '0')}@seed.example.com`,
					roleId: roleIds[s * perStore + 1 + (i % (perStore - 1))]!,
					invitedBy: ownerId,
					token: `seed-inv-token-${String(i).padStart(5, '0')}`,
					status: pick(INVITE_STATUSES, i),
					expiresAt: daysFromNow(i % 4 === 3 ? -1 : 7),
				};
			},
		);
		tables.push({ name: 'store_invitations', rows, expected: N });
	}

	// ── store_preferences (5: PK is store_id) ──
	{
		const rows: Array<typeof schema.storePreferences.$inferInsert> =
			storeIds.map((storeId, s) => ({
				storeId,
				frontendUrl: `https://store-${s}.seed.example.com`,
				htmlTemplate: 'default',
			}));
		tables.push({
			name: 'store_preferences',
			rows,
			expected: STORE_COUNT,
			capped: 'PK is store_id: max 1 row per store (5 stores)',
		});
	}

	// ── suppliers (N: 100/store) ──
	const supplierIds: string[] = [];
	{
		const rows: Array<typeof schema.suppliers.$inferInsert> = [];
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const id = deterministicUuid('supplier', s * perStore + j);
				supplierIds.push(id);
				rows.push({
					id,
					storeId: storeIds[s]!,
					name: `Supplier ${s}-${j}`,
					contactEmail: `supplier-${s}-${j}@seed.example.com`,
					contactPhone: `+1-555-${String(3_000_000 + s * perStore + j).slice(1)}`,
					address: `${200 + j} ${pick(STREET, j)}, ${pick(CITY, j)}`,
					isActive: j % 10 !== 0,
				});
			}
		}
		tables.push({ name: 'suppliers', rows, expected: N });
	}

	// ── products (N: 100/store) ──
	const productIds: string[] = [];
	const productStore: number[] = [];
	{
		const rows: Array<typeof schema.products.$inferInsert> = [];
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const idx = s * perStore + j;
				const id = deterministicUuid('product', idx);
				productIds.push(id);
				productStore.push(s);
				rows.push({
					id,
					storeId: storeIds[s]!,
					supplierId: supplierIds[s * perStore + (j % perStore)]!,
					name: `${pick(ADJ, idx)} ${pick(NOUN, idx)} ${j}`,
					slug: `product-${s}-${j}`,
					description: `Seed product ${j} of store ${s}`,
					status: pick(PRODUCT_STATUSES, idx),
				});
			}
		}
		tables.push({ name: 'products', rows, expected: N });
	}

	// ── product_images (N: 1 per product) ──
	{
		const rows: Array<typeof schema.productImages.$inferInsert> = productIds.map(
			(productId, i) => ({
				productId,
				url: `https://cdn.seed.example.com/products/${i}/img-0.jpg`,
				altText: `Seed image for product ${i}`,
				sortOrder: 0,
			}),
		);
		tables.push({ name: 'product_images', rows, expected: N });
	}

	// ── product_variants (N: 1 per product, globally unique SKU) ──
	const variantIds: string[] = [];
	{
		const rows: Array<typeof schema.productVariants.$inferInsert> =
			productIds.map((productId, i) => {
				const id = deterministicUuid('variant', i);
				variantIds.push(id);
				const price = money(5, 500);
				return {
					id,
					productId,
					sku: `SEED-SKU-${String(i).padStart(5, '0')}`,
					name: `${pick(COLOR, i)} / ${pick(SIZE, i)}`,
					price,
					compareAtPrice: i % 3 === 0 ? (Number(price) * 1.2).toFixed(4) : undefined,
					costPrice: i % 2 === 0 ? (Number(price) * 0.6).toFixed(4) : undefined,
					thumbnailUrl: `https://cdn.seed.example.com/variants/${i}/thumb.jpg`,
					status: pick(VARIANT_STATUSES, i),
					sortOrder: 0,
				};
			});
		tables.push({ name: 'product_variants', rows, expected: N });
	}

	// ── variant_labels (N: 1 per variant, cycling label names) ──
	{
		const values: Record<string, readonly string[]> = {
			Color: COLOR,
			Size: SIZE,
			Material: MATERIAL,
			Style: ADJ,
		};
		const rows: Array<typeof schema.variantLabels.$inferInsert> = variantIds.map(
			(variantId, i) => {
				const labelName = LABEL_NAMES[i % LABEL_NAMES.length]!;
				return {
					variantId,
					labelName,
					labelValue: pick(values[labelName]!, i),
				};
			},
		);
		tables.push({ name: 'variant_labels', rows, expected: N });
	}

	// ── variant_images (N: 1 per variant) ──
	{
		const rows: Array<typeof schema.variantImages.$inferInsert> = variantIds.map(
			(variantId, i) => ({
				variantId,
				url: `https://cdn.seed.example.com/variants/${i}/img-0.jpg`,
				altText: `Seed image for variant ${i}`,
				sortOrder: 0,
			}),
		);
		tables.push({ name: 'variant_images', rows, expected: N });
	}

	// ── categories (N: 100/store; 20 roots + 80 children per store) ──
	const categoryIds: string[] = [];
	{
		const rows: Array<typeof schema.categories.$inferInsert> = [];
		const rootsPerStore = 20;
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const idx = s * perStore + j;
				const id = deterministicUuid('category', idx);
				categoryIds.push(id);
				rows.push({
					id,
					storeId: storeIds[s]!,
					parentId:
						j < rootsPerStore
							? undefined
							: categoryIds[s * perStore + (j % rootsPerStore)]!,
					name: `${pick(ADJ, idx)} Category ${j}`,
					slug: `cat-${s}-${j}`,
					description: `Seed category ${j} of store ${s}`,
					sortOrder: j,
					isActive: j % 12 !== 0,
				});
			}
		}
		tables.push({ name: 'categories', rows, expected: N });
	}

	// ── product_categories (N: unique product×category pairs, same store) ──
	{
		const rows: Array<typeof schema.productCategories.$inferInsert> =
			productIds.map((productId, i) => {
				const s = productStore[i]!;
				return {
					productId,
					categoryId: categoryIds[s * perStore + ((i * 13 + 5) % perStore)]!,
				};
			});
		tables.push({ name: 'product_categories', rows, expected: N });
	}

	// ── warehouses (N: 100/store) ──
	const warehouseIds: string[] = [];
	{
		const rows: Array<typeof schema.warehouses.$inferInsert> = [];
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const id = deterministicUuid('warehouse', s * perStore + j);
				warehouseIds.push(id);
				rows.push({
					id,
					storeId: storeIds[s]!,
					name: `Warehouse ${s}-${j}`,
					address: `${300 + j} ${pick(STREET, j + 1)}, ${pick(CITY, j + 1)}`,
					isActive: j % 10 !== 0,
				});
			}
		}
		tables.push({ name: 'warehouses', rows, expected: N });
	}

	// ── inventory_items (N: variant[i] × same-store warehouse, unique batch) ──
	const itemIds: string[] = [];
	{
		const rows: Array<typeof schema.inventoryItems.$inferInsert> =
			variantIds.map((variantId, i) => {
				const s = productStore[i]!;
				const id = deterministicUuid('inv-item', i);
				itemIds.push(id);
				return {
					id,
					variantId,
					warehouseId: warehouseIds[s * perStore + ((i * 7 + 3) % perStore)]!,
					batchNumber: `BATCH-SEED-${String(i).padStart(5, '0')}`,
					restockDate: i % 5 === 0 ? daysFromNow(14) : undefined,
					expiryDate: i % 7 === 0 ? daysFromNow(365) : undefined,
					lowStockThreshold: 5 + (i % 16),
				};
			});
		tables.push({ name: 'inventory_items', rows, expected: N });
	}

	// ── inventory_levels (N: 1:1 with items) ──
	{
		const rows: Array<typeof schema.inventoryLevels.$inferInsert> = itemIds.map(
			(inventoryItemId, i) => {
				const onHand = int(0, 1000);
				return {
					inventoryItemId,
					quantityOnHand: onHand,
					quantityReserved: Math.min(onHand, int(0, 50)),
				};
			},
		);
		tables.push({ name: 'inventory_levels', rows, expected: N });
	}

	// ── inventory_adjustments (N) ──
	{
		const reasons = [
			'Cycle count correction',
			'Supplier delivery',
			'Customer return',
			'Damaged in transit',
			'Store transfer',
			'Order fulfillment',
		] as const;
		const rows: Array<typeof schema.inventoryAdjustments.$inferInsert> =
			Array.from({ length: N }, (_, i) => ({
				inventoryItemId: itemIds[i % itemIds.length]!,
				adjustmentType: pick(ADJ_TYPES, i),
				quantityChange: pick(ADJ_TYPES, i) === 'sale' ? -(1 + (i % 20)) : 1 + (i % 50),
				reason: pick(reasons, i),
				adjustedBy: i % 6 === 0 ? undefined : ownerId,
			}));
		tables.push({ name: 'inventory_adjustments', rows, expected: N });
	}

	// ── promotions (N: cycling types with type-appropriate sparse fields) ──
	{
		const rows: Array<typeof schema.promotions.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => {
				const s = i % STORE_COUNT;
				const type = PROMO_TYPES[i % PROMO_TYPES.length]!;
				const base = {
					storeId: storeIds[s]!,
					promotionType: type,
					name: `Seed Promo ${i}`,
					description: `Seed ${type} promotion ${i}`,
					isActive: i % 9 !== 0,
					validFrom: daysFromNow(-30),
					validUntil: i % 6 === 0 ? undefined : daysFromNow(30),
					maxUsageCount: i % 4 === 0 ? 100 + (i % 900) : undefined,
					currentUsageCount: i % 50,
					minimumCartValue: i % 3 === 0 ? money(10, 100) : undefined,
					targetSkuId:
						i % 4 === 0
							? variantIds[s * perStore + ((i * 11) % perStore)]!
							: undefined,
					targetCategoryId:
						i % 5 === 0
							? categoryIds[s * perStore + ((i * 17) % perStore)]!
							: undefined,
				};
				switch (type) {
					case 'percentage_discount':
						return { ...base, discountPercentage: 5 + (i % 46) };
					case 'fixed_discount':
						return { ...base, discountAmount: money(1, 50) };
					case 'buy_x_get_y':
						return { ...base, buyQuantity: 1 + (i % 3), getQuantity: 1 + (i % 2) };
					case 'free_shipping':
						return { ...base, minimumCartValue: money(10, 100) };
					case 'bundle_deal':
						return { ...base, bundlePrice: money(20, 200) };
				}
			},
		);
		tables.push({ name: 'promotions', rows, expected: N });
	}

	// ── storefront_users (N: 100/store, unique email per store) ──
	const storefrontUserIds: string[] = [];
	const storefrontUserStore: number[] = [];
	{
		const rows: Array<typeof schema.storefrontUsers.$inferInsert> = [];
		for (let s = 0; s < STORE_COUNT; s++) {
			for (let j = 0; j < perStore; j++) {
				const idx = s * perStore + j;
				const id = deterministicUuid('sf-user', idx);
				storefrontUserIds.push(id);
				storefrontUserStore.push(s);
				rows.push({
					id,
					storeId: storeIds[s]!,
					email: `shopper-${s}-${String(j).padStart(3, '0')}@seed.example.com`,
					emailVerifiedAt: j % 5 === 0 ? undefined : daysFromNow(-(j % 60)),
					passwordHash: `argon2id$seed$v=19$m=19456,t=2,p=1$seed${idx}$hash${idx}`,
					mfaEnabled: j % 11 === 0,
					mfaRecoveryCodes: j % 11 === 0 ? [`rc-${idx}-1`, `rc-${idx}-2`] : undefined,
					failedLoginCount: j % 20 === 0 ? 2 : 0,
					lockedUntil: j % 40 === 0 ? daysFromNow(1) : undefined,
					displayName: `${pick(FIRST, idx)} ${pick(LAST, idx)}`,
					metadata: { seedIndex: idx },
					lastLoginAt: daysFromNow(-(j % 30)),
				});
			}
		}
		tables.push({ name: 'storefront_users', rows, expected: N });
	}

	// ── storefront_oauth_accounts (N: 1 per storefront user) ──
	{
		const rows: Array<typeof schema.storefrontOauthAccounts.$inferInsert> =
			storefrontUserIds.map((userId, i) => {
				const provider = pick(OAUTH_PROVIDERS, i);
				return {
					storeId: storeIds[storefrontUserStore[i]!]!,
					userId,
					provider,
					providerUserId: `seed-${provider}-${String(i).padStart(5, '0')}`,
				};
			});
		tables.push({ name: 'storefront_oauth_accounts', rows, expected: N });
	}

	// ── storefront_password_resets (N: 1 per storefront user) ──
	{
		const rows: Array<typeof schema.storefrontPasswordResets.$inferInsert> =
			storefrontUserIds.map((userId, i) => ({
				storeId: storeIds[storefrontUserStore[i]!]!,
				userId,
				tokenHash: `sha256:seed-reset-${String(i).padStart(5, '0')}`,
				expiresAt: daysFromNow(i % 10 === 0 ? -1 : 1),
				usedAt: i % 3 === 0 ? daysFromNow(-1) : undefined,
			}));
		tables.push({ name: 'storefront_password_resets', rows, expected: N });
	}

	// ── storefront_email_verifications (N: 1 per storefront user) ──
	{
		const rows: Array<typeof schema.storefrontEmailVerifications.$inferInsert> =
			storefrontUserIds.map((userId, i) => ({
				storeId: storeIds[storefrontUserStore[i]!]!,
				userId,
				tokenHash: `sha256:seed-verify-${String(i).padStart(5, '0')}`,
				expiresAt: daysFromNow(i % 8 === 0 ? -1 : 2),
			}));
		tables.push({ name: 'storefront_email_verifications', rows, expected: N });
	}

	// ── inbox_events (N) ──
	{
		const providers = ['clerk', 'stripe', 'svix'] as const;
		const types = ['user.created', 'payment.succeeded', 'webhook.received'] as const;
		const rows: Array<typeof schema.inboxEvents.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => ({
				provider: pick(providers, i),
				eventId: `evt_seed_${String(i).padStart(5, '0')}`,
				queueName: 'webhooks',
				eventType: pick(types, i),
				payload: { seedIndex: i, source: pick(providers, i) },
			}),
		);
		tables.push({ name: 'inbox_events', rows, expected: N });
	}

	// ── outbox_events (N) ──
	{
		const types = [
			'user.welcome',
			'order.status_changed',
			'inventory.low_stock',
			'store.member_invited',
		] as const;
		const rows: Array<typeof schema.outboxEvents.$inferInsert> = Array.from(
			{ length: N },
			(_, i) => {
				const processed = i % 7 === 0;
				return {
					eventType: pick(types, i),
					queueName: 'notifications',
					payload: { seedIndex: i },
					status: processed ? 'processed' : 'pending',
					retryCount: i % 5 === 0 ? 2 : 0,
					maxRetries: 5,
					processedAt: processed ? daysFromNow(-1) : undefined,
					scheduledAt: daysFromNow(0),
				};
			},
		);
		tables.push({ name: 'outbox_events', rows, expected: N });
	}

	return tables;
}

// ─────────────────────────────────────────
// Dry-run validators: uniqueness keys per constrained table
// ─────────────────────────────────────────

const key = (row: Record<string, unknown>, ...fields: string[]): string =>
	fields.map((f) => String(row[f] ?? '∅')).join('|');

export const UNIQUE_CHECKS: Record<string, (row: Record<string, unknown>) => string> = {
	currencies: (r) => key(r, 'code'),
	user_phones: (r) => key(r, 'countryCode', 'phone'),
	user_payment_methods: (r) => key(r, 'providerPaymentMethodId'),
	user_notification_preferences: (r) => key(r, 'userId', 'channel', 'type'),
	exchange_rates: (r) => key(r, 'fromCurrencyCode', 'toCurrencyCode'),
	stores: (r) => key(r, 'slug'),
	store_roles: (r) => key(r, 'storeId', 'name'),
	store_role_permissions: (r) => key(r, 'storeRoleId', 'permissionKey'),
	store_invitations: (r) => key(r, 'token'),
	suppliers: (r) => key(r, 'storeId', 'name'),
	products: (r) => key(r, 'storeId', 'slug'),
	product_variants: (r) => key(r, 'sku'),
	variant_labels: (r) => key(r, 'variantId', 'labelName'),
	categories: (r) => key(r, 'storeId', 'slug'),
	product_categories: (r) => key(r, 'productId', 'categoryId'),
	warehouses: (r) => key(r, 'storeId', 'name'),
	inventory_items: (r) => key(r, 'variantId', 'warehouseId', 'batchNumber'),
	inventory_levels: (r) => key(r, 'inventoryItemId'),
	storefront_users: (r) => key(r, 'storeId', 'email'),
	storefront_oauth_accounts: (r) => key(r, 'storeId', 'provider', 'providerUserId'),
	inbox_events: (r) => key(r, 'provider', 'eventId'),
};
