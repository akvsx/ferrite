---
name: nest-repository
description: >
  Guidance for implementing Drizzle ORM repository classes in the Ferrite core application.
  Use this skill when creating, editing, or reviewing repository infrastructure classes,
  adding new DB operations, or applying security/tracing patterns. Trigger for "repository",
  "drizzle", "traceDbOp", "findById", "storeId ownership", "soft delete", "private method".
---

# Repository Infrastructure (Drizzle ORM)

Path: `src/modules/<feature>/infrastructure/persistence/repositories/`

## Rules

- **Tracing:** Every public method wraps DB query in `traceDbOp`. Span name: `db.<table>.<op>`. Attrs: `db.table`, `db.operation`. No `tracer.withSpan` (use-case only). No PII in spans.
- **Store ownership:** Filter on **both** `id` AND `storeId`. `id`-only = cross-tenant bug. Port sigs: `findByIdAndStore(id, storeId)`, `update(id, storeId, payload)`, `delete(id, storeId)`.
- **Private helpers:** Extract shared duplicate conditions to private methods to increase code reusability and maintainability.
- **Soft delete:** Set `deletedAt`, use `.returning()`, return `boolean`. No extra SELECT.
- **Constructor:** Inject `@Inject(DB) db: TDatabase` + `@Inject(OTEL_TRACER) tracer: ITracer`. No `AppLogger`.

## Tracing Example

```typescript
async findById(id: string): Promise<MyEntity | null> {
  return traceDbOp(this.tracer, 'db.my_table.findById',
    { 'db.table': 'my_table', 'db.operation': 'select' },
    async () => {
      const [row] = await this.db.select().from(myTable).where(eq(myTable.id, id)).limit(1);
      return row ? MyEntityMapper.toDomain(row) : null;
    }
  );
}
```

## Store Ownership

Filter on **both** `id` AND `storeId` for any store-scoped resource. `id`-only = cross-tenant bug.

```typescript
// scoped
.where(and(eq(myTable.id, id), eq(myTable.storeId, storeId)))
// cross-tenant
.where(eq(myTable.id, id))
```

Port sigs: `findByIdAndStore(id, storeId)`, `update(id, storeId, payload)`, `delete(id, storeId)`.
`findByStoreId` (list) naturally scoped — no change needed.

## PII Rules
- **SECURITY/PII Rule:** NEVER leak sensitive information that can be used to identify individuals (PII) such as emails, phone numbers, raw passwords, or full names in logs or trace spans. If you must log a user context, use their opaque ID.


## New Repository

```
cp .agents/skills/nest-repository/repository.ts.template \
   apps/core/src/modules/<feature>/infrastructure/persistence/repositories/drizzle-<feature>.repository.ts
```
