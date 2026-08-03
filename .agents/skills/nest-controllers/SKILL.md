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
The application utilizes a dual authentication architecture for external users and internal administrators for storefront facing routes.
- **Storefront Users:** Standard endpoints (e.g., `/stores/:storeId/users/me`) are for end-users operating on their own data or public data.
- **Admin Users:** Administrative endpoints MUST be nested under an `/admin` path (or clearly separated in a `.admin.controller.ts` file) and employ different auth guards. Admins can operate on other users' data (e.g., by ID).
- Keep the controllers separate. Do not mix storefront and admin routes in the same controller class.

## 2. PII Rules
- **SECURITY/PII Rule:** NEVER leak sensitive information that can be used to identify individuals (PII) such as emails, phone numbers, raw passwords, or full names in logs or trace spans. If you must log a user context, use their opaque ID.


## 3. Resolving Errors
- Controllers are the outer boundary of the application. Business logic and use cases will return a `Result<T, E>` object (from Hexagonal Architecture).
- The controller is strictly responsible for inspecting `result.ok` and unwrapping the value, or mapping the domain error into the appropriate NestJS HTTP Exception.
- **Example:** `if (!result.ok) throw new NotFoundException(result.error.message);`
- **Never** place business calculations or validations directly inside the controller.

## 4. Boilerplate Template
- **INSTRUCTION:** When creating a new controller, DO NOT write it from scratch. Instead, copy the template provided in `.agents/skills/nest-controllers/controller.template.ts`.
- **Example Command:** `cp .agents/skills/nest-controllers/controller.template.ts apps/core/src/modules/my-module/infrastructure/http/controllers/my-controller.ts`
- Use the `@/` path alias to import common modules when appropriate, or the defined `tsconfig.json` aliases.
