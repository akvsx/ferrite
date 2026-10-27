#!/usr/bin/env bun
/**
 * Dev database seeder.
 *
 * Usage (from apps/core):
 *   bun dev/seed.ts --dry-run   # validate counts + uniqueness, no DB needed
 *   bun dev/seed.ts              # TRUNCATE seed tables, then insert
 *   bun dev/seed.ts --no-clean   # insert without truncating first
 *   SEED_N=100 bun dev/seed.ts   # override rows per table (default 500)
 *
 * Requires DATABASE_URL (reads apps/core/.env if present).
 * Dataset: 1 owner user, 5 stores, N rows per table. A few tables are
 * capped below N by hard DB constraints — see `capped` notes in
 * ./seed-data.ts. There is no orders table in the schema, so none is seeded.
 */

import { config as loadEnv } from 'dotenv';
import { getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/core/database/schema';
import { buildSeedData, N, UNIQUE_CHECKS } from './seed-data';

loadEnv({ path: '.env' });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const NO_CLEAN = args.has('--no-clean');

if (args.has('--help') || args.has('-h')) {
	console.log(
		'Usage: bun dev/seed.ts [--dry-run] [--no-clean]\n' +
			'Env: DATABASE_URL (required unless --dry-run), SEED_N (default 500)',
	);
	process.exit(0);
}

const tables = buildSeedData();
const total = tables.reduce((sum, t) => sum + t.rows.length, 0);

// ── dry run: validate counts + uniqueness, no DB ──
if (DRY_RUN) {
	let failed = 0;
	console.log(`dry-run validation (SEED_N=${N})\n`);
	console.log(
		`${'table'.padEnd(32)} ${'rows'.padStart(6)} ${'expected'.padStart(9)}  notes`,
	);
	for (const t of tables) {
		const issues: string[] = [];
		if (t.rows.length !== t.expected) {
			issues.push(`count ${t.rows.length} != expected ${t.expected}`);
		}
		const check = UNIQUE_CHECKS[t.name];
		if (check) {
			const seen = new Set<string>();
			for (const row of t.rows) {
				const k = check(row);
				if (seen.has(k)) {
					issues.push(`duplicate key ${k}`);
					break;
				}
				seen.add(k);
			}
		}
		if (issues.length > 0) failed++;
		const status = issues.length > 0 ? `FAIL: ${issues.join('; ')}` : (t.capped ?? 'ok');
		console.log(
			`${t.name.padEnd(32)} ${String(t.rows.length).padStart(6)} ${String(t.expected).padStart(9)}  ${status}`,
		);
	}
	console.log(`\n${tables.length} tables, ${total} rows. ${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} FAILURES`}`);
	process.exit(failed === 0 ? 0 : 1);
}

// ── live run ──
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set. Put it in apps/core/.env or export it.');
	process.exit(1);
}
try {
	const host = new URL(databaseUrl).host;
	console.log(`Seeding ${host} (SEED_N=${N})…`);
} catch {
	console.log(`Seeding database (SEED_N=${N})…`);
}

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
const db = drizzle(pool, { schema });

// Name → drizzle table for every pgTable exported from the schema module
// (relations/enums throw in getTableName and are skipped).
const tableByName = new Map<string, Parameters<typeof db.insert>[0]>();
for (const value of Object.values(schema)) {
	try {
		tableByName.set(
			getTableName(value as never),
			value as Parameters<typeof db.insert>[0],
		);
	} catch {
		// not a table (relation helper, enum, …)
	}
}

function resolveTable(name: string) {
	const table = tableByName.get(name);
	if (!table) throw new Error(`Table export not found for "${name}"`);
	return table;
}

if (!NO_CLEAN) {
	console.log('Truncating seed tables…');
	await db.execute(sql`
		TRUNCATE TABLE
			storefront_email_verifications,
			storefront_password_resets,
			storefront_oauth_accounts,
			store_preferences,
			inbox_events,
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

const CHUNK = 200;
for (const t of tables) {
	const table = resolveTable(t.name);
	for (let i = 0; i < t.rows.length; i += CHUNK) {
		const chunk = t.rows.slice(i, i + CHUNK);
		await db.insert(table).values(chunk as never);
	}
	console.log(`  ${t.name}: ${t.rows.length} rows${t.capped ? ` (${t.capped})` : ''}`);
}

await pool.end();
console.log(`\nDone: ${tables.length} tables, ${total} rows.`);
console.log(
	'Note: there is no orders table in src/core/database/schema, so none was seeded.',
);
