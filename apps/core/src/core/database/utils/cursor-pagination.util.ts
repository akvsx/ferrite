import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import type { SQL } from 'drizzle-orm';
import { and, asc, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────

export interface CursorPaginationOpts {
	/** The table being queried (used for the cursor subquery) */
	table: PgTable;
	/** The primary-key column (e.g. `categories.id`) */
	idColumn: PgColumn;
	/** The column to sort + paginate by (e.g. `categories.createdAt`) */
	sortColumn: PgColumn;
	/** Opaque cursor from the client (the last item's ID) */
	cursor?: string;
	/** Page size */
	limit: number;
	/** Additional WHERE conditions (e.g. storeId filter) */
	filters?: SQL[];
}

/**
 * Build cursor-pagination WHERE + ORDER + LIMIT clauses.
 *
 * When a cursor (item ID) is provided, generates a subquery:
 * `sortColumn > (SELECT sortColumn FROM table WHERE idColumn = cursor)`
 *
 * Single query — no extra roundtrip.
 */
export const cursorPaginationClauses = (opts: CursorPaginationOpts) => {
	const { table, idColumn, sortColumn, cursor, limit, filters = [] } = opts;

	const conditions: SQL[] = [...filters];
	if (cursor) {
		const filterSql = filters.length > 0 ? sql` AND ${and(...filters)}` : sql``;
		const cursorSubquery = sql`(SELECT ${sortColumn} FROM ${table} WHERE ${idColumn} = ${cursor}${filterSql})`;
		conditions.push(
			sql`(${sortColumn}, ${idColumn}) > (${cursorSubquery}, ${cursor})`
		);
	}

	return {
		where: conditions.length > 0 ? and(...conditions) : undefined,
		orderBy: [asc(sortColumn), asc(idColumn)],
		queryLimit: limit + 1,
	};
};

// ─────────────────────────────────────────
// Response builder
// ─────────────────────────────────────────

/**
 * Slice the over-fetched rows and build a `PaginatedResponse`.
 *
 * @param rows     - Raw DB rows (fetched with `limit + 1`)
 * @param limit    - Requested page size
 * @param mapItem  - Transform a row into the domain type
 * @param getId    - Extract the item's ID from the last raw row (used as nextCursor)
 */
export const buildPaginatedResponse = <TRow, TDomain>(
	rows: TRow[],
	limit: number,
	mapItem: (row: TRow) => TDomain,
	getId: (row: TRow) => string
): PaginatedResponse<TDomain> => {
	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, -1) : rows;

	return {
		items: items.map(mapItem),
		nextCursor: hasMore ? getId(items[items.length - 1]) : undefined,
	};
};
