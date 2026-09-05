import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import type { SQL } from 'drizzle-orm';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

// Query helpers

export interface CursorPaginationOpts {
	/** The primary-key column (e.g. `categories.id`) */
	idColumn: PgColumn;
	/** The column to sort + paginate by (e.g. `categories.createdAt`) */
	sortColumn: PgColumn;
	/**
	 * Cursor encoding the last item from the previous page, as
	 * base64 JSON of `{ id, sortValue }`. Validated as a UUID at the
	 * API/schema boundary.
	 */
	cursor?: string;
	/** Page size */
	limit: number;
	/** Additional WHERE conditions (e.g. storeId filter) */
	filters?: SQL[];
	/** Tenant scoping column (e.g. `categories.storeId`) — required, not optional */
	tenantColumn: PgColumn;
	/** The tenant id to scope by (from the authenticated session, never client input) */
	tenantId: string;
}

interface CursorData {
	id: string;
	sortValue: unknown;
}

const isValidCursorData = (value: unknown): value is CursorData =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as CursorData).id === 'string' &&
	(value as CursorData).id.length > 0 &&
	(value as CursorData).sortValue !== undefined &&
	(value as CursorData).sortValue !== null;

/**
 * Build cursor-pagination WHERE + ORDER + LIMIT clauses.
 *
 * The cursor is opaque base64-encoded JSON of `{ id, sortValue }`
 * produced by `buildPaginatedResponse` for the previous page. It is
 * decoded directly (no extra DB roundtrip) and used in a tuple
 * comparison against the sort/id columns:
 *
 *   (sortColumn, idColumn) > (cursor.sortValue, cursor.id)
 *
 * The tuple comparison (rather than `sortColumn > cursor.sortValue`
 * alone) is what makes pagination correct when `sortColumn` has
 * duplicate values - `idColumn` acts as a deterministic tiebreaker,
 * which is why `orderBy` must sort by the same two columns in the
 * same order.
 */
export const cursorPaginationClauses = (opts: CursorPaginationOpts) => {
	const {
		idColumn,
		sortColumn,
		cursor,
		limit,
		filters = [],
		tenantColumn,
		tenantId,
	} = opts;

	// Tenant condition is built here, not left to the caller to remember.
	const conditions: SQL[] = [eq(tenantColumn, tenantId), ...filters];

	if (cursor) {
		let decoded: unknown;
		try {
			decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
		} catch {
			throw new Error('Invalid cursor format');
		}

		if (!isValidCursorData(decoded)) {
			throw new Error('Invalid cursor format');
		}

		conditions.push(
			sql`(${sortColumn}, ${idColumn}) > (${decoded.sortValue}, ${decoded.id})`
		);
	}

	return {
		where: and(...conditions), // always non-empty now — tenantColumn guarantees it
		orderBy: [asc(sortColumn), asc(idColumn)],
		queryLimit: limit + 1,
	};
};

// Response builder

/**
 * Slice the over-fetched rows and build a `PaginatedResponse`.
 *
 * @param rows          - Raw DB rows (fetched with `limit + 1`)
 * @param limit         - Requested page size
 * @param mapItem       - Transform a row into the domain type
 * @param getCursorData - Extract `{ id, sortValue }` from the last raw
 *                        row of the page; encoded as the `nextCursor`
 */
export const buildPaginatedResponse = <TRow, TDomain>(
	rows: TRow[],
	limit: number,
	mapItem: (row: TRow) => TDomain,
	getCursorData: (row: TRow) => CursorData
): PaginatedResponse<TDomain> => {
	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, -1) : rows;

	let nextCursor: string | undefined;
	if (hasMore) {
		const cursorData = getCursorData(items[items.length - 1]);
		nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
	}

	return {
		items: items.map(mapItem),
		nextCursor,
	};
};
