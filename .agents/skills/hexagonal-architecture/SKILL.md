---
name: hexagonal-architecture
description: >
  Comprehensive guidance for designing, scaffolding, reviewing, and refactoring modules
  using Hexagonal Architecture (Ports and Adapters) in TypeScript/NestJS projects.
  Use this skill whenever the user asks to: create a new module, add a feature, review
  existing code for architectural violations, refactor toward hexagonal boundaries, design
  ports/adapters, model domain errors, wire up use cases, structure repositories, or discuss
  dependency rules. Trigger on terms like "use case", "port", "adapter", "domain layer",
  "repository pattern", "application layer", "infrastructure layer", "Result type",
  "DomainError", "mapper", or any request to scaffold a new NestJS feature module.
---

# Hexagonal Architecture

**Dep rule:** Infrastructure → Application → Domain. Never outward.

| Layer | Allowed | Forbidden |
|---|---|---|
| **Domain** | `zod`, pure TS | ORM, NestJS decorators, any SDK |
| **Application** | Domain ports/schemas/errors, Result | ORM, HTTP, mapper classes, concrete infra |
| **Infrastructure** | Everything above + ORM/SDKs/NestJS | Business logic, ORM types leaking through ports |

## Directory Structure

```text
apps/core/src/modules/<feature>/
├── domain/
│   ├── schemas/       # Zod schemas (.zodschema.ts)
│   ├── ports/         # Interfaces prefixed I + DI token (co-located)
│   ├── errors/        # DomainError classes (_tag field)
│   └── events/
├── application/use-cases/
└── infrastructure/
    ├── http/{controllers,dto,decorators,guards,pipes}/
    ├── persistence/{repositories,mappers}/
    └── queue/{producers,consumers}/
```

## Key Conventions

**Port + token:**
```typescript
export const USER_REPOSITORY = Symbol('IUserRepository');
export interface IUserRepository { findById(id: string): Promise<UserProfile | null>; }
```

**Domain error:**
```typescript
export class UserNotFoundError extends Error { readonly _tag = 'UserNotFoundError'; }
```

**Use case:** One file, one `execute()`, returns `Result<T,E>`, injects ports via token only.
```typescript
async execute(input): Promise<Result<UserProfile, UserNotFoundError>> {
  const user = await this.userRepo.findById(input.userId);
  return user ? ok(user) : err(new UserNotFoundError(input.userId));
}
```

**Mapper:** Always run ORM rows through mapper before returning from repo.
```typescript
static toDomain(row: typeof users.$inferSelect): UserProfile { return UserProfileSchema.parse(row); }
```

**DTO:** `createZodDto` wrappers in `infrastructure/http/dto/` only — never in domain.

**Module wiring:** `{ provide: USER_REPOSITORY, useClass: DrizzleUserRepository }`

## Anti-Patterns

| Bad | Fix |
|---|---|
| ORM type in port signature | Use domain Zod type; mapper converts |
| Concrete class injected in use case | Port interface + DI token |
| `createZodDto` in domain schema | Move DTO wrapper to infra |
| `throw` for expected failure | `return err(new DomainError())` |
| Business logic in controller/repo | Move to domain or use case |

## New Module Checklist

- [ ] No ORM/SDK imports in `domain/` or `application/`
- [ ] Every external dep → Port in `domain/ports/`
- [ ] Use cases return `Result<T,E>`, never throw expected failures
- [ ] Repo methods return domain types (via Mapper)
- [ ] DI tokens co-located with Port interface
- [ ] `createZodDto` DTOs in `infrastructure/http/dto/` only

## References

- `references/result-type.md` — `ok()`, `err()`, combinators
- `references/domain-events.md` — Outbox pattern
- `references/testing-strategy.md` — Unit/integration testing
