---
name: nest-controllers
description: >
  Guidance for building HTTP controllers in the Ferrite core application. Use this skill
  when creating new routes, defining controllers, working with API endpoints, mapping
  HTTP errors, or implementing the dual auth architecture (storefront vs admin).
  Trigger for "controller", "endpoint", "route", "http error", "admin path", "dual auth".
---

# NestJS Controllers

This skill outlines the architectural conventions for building HTTP controllers in the Ferrite API.

## 1. Dual Auth Architecture & Admin Paths
The application utilizes a dual authentication architecture for external users and internal administrators for storefront-facing routes.
- **Storefront Users:** Standard endpoints (e.g., `/stores/:storeId/users/me`) are for end-users operating on their own data or public data.
- **Admin Users:** Administrative endpoints MUST be nested under an `/admin` path (or clearly separated in a `.admin.controller.ts` file) and employ different auth guards. Admins can operate on other users' data (e.g., by ID).
- Keep the controllers separate. Do not mix storefront and admin routes in the same controller class.

## 2. PII Rules
- **SECURITY/PII Rule:** NEVER leak sensitive information that can be used to identify individuals (PII) such as emails, phone numbers, raw passwords, or full names in logs or trace spans. If you must log a user context, use their opaque ID.

## 3. Roles and Permissions
- When dealing with access control, guards, and permissions, you MUST check the `roles-and-permissions` skill file (`.agents/skills/roles-and-permissions/SKILL.md`) for detailed rules on platform-level vs. store-level roles.
- NEVER assume a permission for an endpoint; always ask for confirmation in the implementation plan if it is not explicitly provided by the user.

## 4. Resolving Errors
- Controllers are the outer boundary of the application. Business logic and use cases will return a `Result<T, E>` object (from Hexagonal Architecture).
- The controller is strictly responsible for inspecting `result.ok` and unwrapping the value, or mapping the domain error into the appropriate NestJS HTTP Exception.
- **Example:** `if (!result.ok) throw new NotFoundException(result.error.message);`
- **Never** place business calculations or validations directly inside the controller.

## 5. Boilerplate Template
- **INSTRUCTION:** When creating a new controller, DO NOT write it from scratch. Instead, copy the template provided in `.agents/skills/nest-controllers/controller.ts.template`.
- **Example Command:** `cp .agents/skills/nest-controllers/controller.ts.template apps/core/src/modules/my-module/infrastructure/http/controllers/my-controller.ts`
- Use the `@/` path alias to import common modules when appropriate, or the defined `tsconfig.json` aliases.

## 6. Swagger Documentation
- **Separate Files:** Swagger documentation decorators (`@ApiOperation`, `@ApiResponse`, etc.) MUST be defined in a separate file, typically at `infrastructure/http/docs/<module>.docs.ts`.
- **Storefront & Admin Controllers:** If the module is storefront-facing, there might be two controllers (e.g., Storefront and Admin). Document them separately in separate doc files.
- **Applying Decorators:** Group the decorators for each endpoint using `applyDecorators(...)` in the docs file, export the function, and then use it as a single decorator on the controller method (e.g., `@LoginDocs()`).
- **Authentication:** Ensure you use bearer token authentication (e.g., `@ApiBearerAuth()`) in the Swagger docs for protected routes.
