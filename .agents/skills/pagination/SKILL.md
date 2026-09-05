---
name: pagination
description: >
  Documentation and guidelines for implementing cursor-based pagination in the Ferrite repository.
  Use this skill when creating or modifying list endpoints and queries.
  Trigger for "pagination", "list routes", "cursor", "list query".
---

# Pagination Architecture

This skill defines conventions for implementing cursor-based pagination across the stack.

## 1. Zod Schemas
- **Payload Schema:** Always extend `PaginationInputSchema` for GET queries that return lists.
- **Example:** `export const ListItemsQuerySchema = PaginationInputSchema.extend({ ... });`

## 2. HTTP Controllers
- **Decorators:** Extract pagination params using `@Pagination() pagination: PaginationInput`. 
- **Swagger Docs:** Add `@ApiPagination()` to the route.
- **Payload:** Merge the extracted `pagination` object with the validated query before passing to the use case.

## 3. Domain Use Cases (Ports)
- **Port Interface:** The input type must intersect with `PaginationInput`, and return `PaginatedResponse<T>`.
- **Execution:** Pass `limit` and `cursor` cleanly into the repository arguments.

## 4. Drizzle Repositories (Queries)
- **Avoid Offsets:** **DO NOT** use `offset`. Always use cursor-based pagination.
- **Helpers:** Use `cursorPaginationClauses` to safely generate SQL clauses (sorting by UUID + timestamp) and `buildPaginatedResponse` to process over-fetched rows into the final payload.

**Query Implementation Pattern:**
```typescript
import { cursorPaginationClauses, buildPaginatedResponse } from '@core/database/utils/cursor-pagination.util';

// 1. Generate Clauses
const { where, orderBy, queryLimit } = cursorPaginationClauses({
    table: myTable, 
    idColumn: myTable.id, 
    sortColumn: myTable.createdAt,
    cursor: query.cursor, 
    limit: query.limit ?? 20, 
    filters
});

// 2. Fetch limit + 1
const rows = await db.select().from(myTable).where(where).orderBy(...orderBy).limit(queryLimit);

// 3. Format Response
return buildPaginatedResponse(rows, query.limit ?? 20, ItemMapper.toDomain, (row) => row.id);
```
