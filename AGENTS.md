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
- **Repositories:** Load `nest-repository` when defining repositories for external dependencies (DB, services).
- **Database Schemas:** Load `drizzle-schemas` when defining new database tables, modifying relations, or writing DB schema tests.
- **Roles & Permissions:** Load `roles-and-permissions` when dealing with admin routes, authorization guards, platform RBAC, or store-level granular permissions.
- **Unit of Work:** Load `unit-of-work` when working with database transactions, atomicity, or coordinating multiple repository calls within a use case.

Note: Skills aren't mutually exclusive most non-trivial tasks touch several layers. Load accordingly.

## Module Context

Before making changes to an existing feature module, ALWAYS check for and read the `README.md` file located at the root of the module (e.g., `apps/core/src/modules/<feature>/README.md`). This file contains comprehensive, module-specific information, boundaries, and rules.

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