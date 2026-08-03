# Ferrite Core — Agent Context
- path: `apps/core`
- description: This directory contains the core NestJS headless application.

## Architecture & Skills

This project follows strict architectural conventions. Before modifying or generating code, you MUST load and read the appropriate skill file based on the component you are working on:

- **General Architecture:** Load `hexagonal-architecture` for any task involving module creation, refactoring, layer boundaries, or discussing dependency rules.
- **Zod Schemas:** Load `zod-schemas` when defining data models, DTO validations, or inferred types.
- **Controllers:** Load `nest-controllers` when writing HTTP endpoints, dealing with dual auth (Storefront vs. Admin), or mapping domain errors to HTTP exceptions.
- **Use Cases:** Load `nest-usecases` when orchestrating business logic, wrapping operations in traces, or configuring debug logging.
- **Ports & Errors:** Load `nest-ports-and-errors` when defining interfaces for external dependencies (DB, services) or custom domain errors.
- **Database Schemas:** Load `drizzle-schemas` when defining new database tables, modifying relations, or writing DB schema tests.

## Runtime & Tooling

| Tool       | Version / Notes                                  |
|------------|--------------------------------------------------|
| Runtime    | Bun                                              |
| Framework  | NestJS                                           |
| ORM        | Drizzle ORM (postgres-js driver)                 |
| Queue      | BullMQ (Redis-backed)                            |
| Validation | Zod v4 (`zod/v4`)                                |
| Tracing    | OpenTelemetry                                    |
| Auth       | Clerk (webhook verification via Svix)            |
| Build      | `bun run build` (nest build + tsc-alias)         |
| Monorepo   | Turborepo                                        |