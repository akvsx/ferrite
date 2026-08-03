---
name: nest-ports-and-errors
description: >
  Guidance for defining Ports (interfaces) and Domain Errors in Hexagonal Architecture. 
  Use this skill when defining database contracts, external service interfaces, or custom 
  error classes for the domain layer. Trigger for "port", "interface", "domain error".
---

# Ports and Domain Errors

This skill defines conventions for the innermost Domain layer components.

## 1. Ports
- **Definition:** Ports are pure TypeScript interfaces that define the contract for any I/O, persistence, or external communication required by the domain.
- **Naming Convention:** Prefix port interfaces with `I` (e.g., `IUserRepository`, `IStoreDelegate`).
- **Location:** Place them in `src/modules/<feature>/domain/ports/`.
- **DI Tokens:** Define a unique `Symbol` alongside the port for dependency injection (e.g., `export const USER_REPOSITORY = Symbol('IUserRepository');`).

## 2. Domain Errors
- **Definition:** Custom error classes that represent domain-level, business logic failures. 
- **Implementation:** Extend the native `Error` class and include a readonly `_tag` property for pattern matching.
- **Example:** 
  ```typescript
  export class ResourceNotFoundError extends Error {
    readonly _tag = 'ResourceNotFoundError';
    constructor(id: string) { super(`Resource ${id} not found`); }
  }
  ```
- **Error Handling Rule:** Always throw or return concrete module-specific errors rather than generic JS `Error` objects, so failures can be easily traced back to the module of origin.

## 3. Database Tracing
- **Tracing Function:** When implementing database operations in a repository, you MUST use the `traceDbOp` utility rather than `tracer.withSpan`.
- **Example:**
  ```typescript
  return traceDbOp(
    this.tracer,
    'db.tableName.operationName',
    { 'db.table': 'table_name', 'db.operation': 'select' },
    async () => { /* db operation */ }
  );
  ```
- **SECURITY/PII Rule:** NEVER leak sensitive information that can be used to identify individuals (PII) such as emails, phone numbers, raw passwords, or full names in trace parameters or logs. If you must log a user context, use their opaque ID.

## 4. Repository Boilerplate Template
- **INSTRUCTION:** When creating a new repository infrastructure class, DO NOT write it from scratch. Instead, copy the template provided in `.agents/skills/nest-ports-and-errors/repository.template.ts`.
- **Example Command:** `cp .agents/skills/nest-ports-and-errors/repository.template.ts apps/core/src/modules/my-module/infrastructure/persistence/repositories/my-repository.ts`
- Use the `@/` path alias or defined `tsconfig.json` aliases to import common modules.
