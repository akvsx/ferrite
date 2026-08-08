---
name: roles-and-permissions
description: >
  Documentation and guidelines for roles, permissions, and access controls in the Ferrite repository.
  Use this skill whenever working with admin routes, authorization guards, platform RBAC, or store-level granular permissions.
  Trigger for "roles", "permissions", "access control", "rbac", "platform-rbac.guard.ts", "store-permission.guard.ts".
---

# Roles and Permissions

This document outlines the roles, permissions, and access controls in the Ferrite repository. There are two distinct types of access controls used for protecting admin routes.

## 1. Platform-Level Roles (Platform RBAC)

Platform-level roles manage access for the platform itself.

- **Managed by:** `PlatformRolesGuard` located in `apps/core/src/modules/auth/infrastructure/http/guards/platform-rbac.guard.ts`.
- **Roles:** `user`, `staff`, `admin`.
- **Hierarchy:** Admin is at the top, followed by staff, then user at the bottom.
  - **Admin and Staff:** Platform developers and maintainers.
  - **Users:** General platform users.
- **Source:** These roles are read directly from the Clerk JWT.

## 2. Store-Level Roles (Granular RBAC)

Store-level roles manage access to specific stores within the platform.

- **Managed by:** `StorePermissionGuard` located in `apps/core/src/modules/store/infrastructure/http/guards/store-permission.guard.ts`.
- **Granular Permissions:** This is a granular Role-Based Access Control (RBAC) system.
- **Source:** Permissions are stored in the database (and cached).
- **Definition:** Available permissions are strictly defined in `packages/schema/src/common/permissions.zodschema.ts`.
- **Database Synchronization:** The permissions defined in the schema are exported and used as a PostgreSQL enum (`permission_key`) in `apps/core/src/core/database/schema/enum.ts`. Whenever you add, remove, or modify a permission in `permissions.zodschema.ts`, you MUST run a database migration generation `bun run db:generate` and `bun run db:migrate` to sync the `permission_key` enum in the database.
- **Usage:** Store-level operations (routes and controllers) MUST specify the exact permissions needed.

## 3. Important Rules

- **Never Assume a Permission:** Always ask the user for confirmation in the implementation plan if the required permissions for an operation are not explicitly specified. Do not guess or assume which permissions apply to a new or modified route.
