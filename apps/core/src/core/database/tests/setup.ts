/**
 * Shared test setup for database schema tests.
 *
 * Usage (in every *.spec.ts):
 *   import { db, setupTestDB, teardownTestDB, cleanupTables } from './setup';
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { TDatabase } from '../db.type';
import * as schema from '../schema';

let client: ReturnType<typeof postgres> | undefined;
let _db: TDatabase;

/** The Drizzle database instance used by all tests. */
export { _db as db };

/**
 * Strip query params like `?schema=public` that postgres.js doesn't support.
 */
function cleanConnectionUrl(raw: string): string {
	const url = new URL(raw);
	url.searchParams.delete('schema');
	return url.toString();
}

/**
 * Initialize the test Postgres client and Drizzle DB instance for tests.
 *
 * Reads the DATABASE_URL environment variable, validates that the database
 * name matches a test pattern (ends with `test`, `_test`, or `-test`, case-insensitive),
 * then creates and stores the Postgres client and Drizzle `PsqlDB` instance.
 *
 * @returns The initialized Drizzle `PsqlDB` instance.
 * @throws If `DATABASE_URL` is not set.
 * @throws If the database name does not match an expected test-pattern.
 */
export async function setupTestDB(): Promise<TDatabase> {
	const raw = process.env.DATABASE_URL;
	if (!raw) {
		throw new Error('DATABASE_URL is not set.');
	}

	const cleaned = cleanConnectionUrl(raw);

	const dbName = new URL(cleaned).pathname.replace(/^\//, '');
	if (!dbName || !/(^test$|_test$|-test$)/i.test(dbName)) {
		throw new Error(
			`Refusing to run DB tests against non-test database "${dbName}".`
		);
	}

	client = postgres(cleaned, {
		max: 1,
		debug: false,
		onnotice: () => {},
	});
	_db = drizzle(client, { schema });
	return _db;
}

/**
 * Truncate all tables involved in user & auth tests.
 * Call in `beforeEach` so every test starts with a clean slate.
 */
export async function cleanupTables(): Promise<void> {
	await _db.execute(sql`
		TRUNCATE TABLE
			promotions,
			inventory_adjustments,
			inventory_levels,
			inventory_items,
			warehouses,
			variant_images,
			variant_labels,
			product_variants,
			product_images,
			product_categories,
			products,
			categories,
			suppliers,
			outbox_events,
			user_auth_providers,
			user_payment_methods,
			user_notification_preferences,
			user_onboarding,
			store_role_permissions,
			store_roles,
			store_invitations,
			store_members,
			stores,
			storefront_users,
			user_phones,
			user_addresses,
			users,
			exchange_rates,
			currencies
		CASCADE
	`);
}

/**
 * Closes the test Postgres client connection and clears the internal client reference.
 *
 * Does nothing if no client is initialized.
 */
export async function teardownTestDB(): Promise<void> {
	if (!client) return;
	await client.end();
	client = undefined;
}
