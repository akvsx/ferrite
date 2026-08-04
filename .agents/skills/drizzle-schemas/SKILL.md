---
name: drizzle-schemas
description: >
  Guidance for defining, updating, and testing database schemas using Drizzle ORM.
  Use this skill when adding new database tables, modifying relations, or writing schema tests.
  Trigger for "database", "schema", "relations", "db:generate", "db:migrate", "drizzle".
---

# Database Schemas (Drizzle ORM)

This skill outlines the strict patterns for modifying the database layer in Ferrite Core. All database code lives in `apps/core/src/core/database/`.

## 1. Defining the Schema
- **Location:** Create a new `.schema.ts` file in `apps/core/src/core/database/schema/` (e.g., `my-feature.schema.ts`).
- **Export:** Export the table definition using `pgTable`.
- **Constraints:** Define indexes, unique constraints, and multi-column primary keys in the second argument of `pgTable`.
- **Index:** You MUST export your new schema from `apps/core/src/core/database/schema/index.ts` so Drizzle picks it up.

## 2. Defining Relations
- **Location:** `apps/core/src/core/database/schema/relations.ts`.
- **Rule:** ALL relations are defined centrally in `relations.ts`. When you create a new table that has foreign keys or is referenced by other tables, you MUST update `relations.ts` and define the `relations()` block. Do not define relations inline in the schema file.

## 3. Writing Schema Tests
- **Location:** Create a new `.schema.spec.ts` file in `apps/core/src/core/database/tests/`.
- **Setup:** Import and use `setupTestDB`, `teardownTestDB`, and `cleanupTables` from `./setup`.
- **Patterns to Test:** 
  - Successful inserts and lookups.
  - Unique constraint violations (assert that `e.cause?.code === '23505'`).
  - Cascade deletes (ensure child rows are deleted when the parent is deleted).

## 4. Generating and Migrating
After modifying schemas or relations, you MUST run the following commands from the `apps/core` directory to generate and apply migrations locally:
- `bun run db:generate` (creates the SQL migration file)
- `bun run db:migrate` (applies the migration to the local dev database)
