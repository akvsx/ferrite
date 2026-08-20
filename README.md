# Ferrite

Ferrite is a **multi-tenant headless commerce platform** built as a Turborepo monorepo. It provides the backend infrastructure and SDKs for building storefronts with full tenant isolation, store management, and dual authentication (platform admins vs. storefront customers).

## Architecture

Ferrite follows **Hexagonal Architecture** (Ports & Adapters) throughout. All modules strictly separate domain logic from infrastructure, making the system testable and provider-agnostic.

| Layer | Detail |
|---|---|
| Runtime | Bun |
| Framework | NestJS |
| ORM | Drizzle ORM (postgres-js) |
| Queue | BullMQ (Redis-backed) |
| Validation | Zod v4 |
| Tracing | OpenTelemetry |
| Auth | Clerk (JWT + webhook via Svix) |
| Monorepo | Turborepo |

---

## Monorepo Structure

```
ferrite/
├── apps/
│   ├── core/          # NestJS headless API (primary backend)
│   └── pulse/         # Next.js storefront PWA
└── packages/
    ├── api/           # API client (typed fetch wrapper)
    ├── react-sdk/     # React hooks & providers
    ├── schema/        # Shared Zod schemas
    └── config/        # Shared config (eslint, tsconfig, etc.)
```

---

## Apps

### `@ferrite/core` — Headless API [`apps/core`](apps/core)

The primary NestJS application. All business logic lives here, split across feature modules.

#### Modules

| Module | Path | Description |
|---|---|---|
| **Auth** | [`modules/auth`](apps/core/src/modules/auth/README.md) | Global realm-based auth guard with dynamic adapter dispatch. Routes requests to either the Clerk JWT (platform) or Redis session (storefront) adapter based on `@UseRealm()`. |
| **Platform Users** | [`modules/platform-users`](apps/core/src/modules/platform-users/README.md) | Platform-level user profiles and RBAC. Syncs with external IdPs (Clerk) via transactional outbox pattern. |
| **Store** | [`modules/store`](apps/core/src/modules/store/README.md) | Multi-tenant store lifecycle — create/update/delete stores, store memberships, and store-level RBAC (Owner/Admin/Member). |
| **Onboarding** | [`modules/onboarding`](apps/core/src/modules/onboarding/README.md) | Backend-authoritative state machine guiding new users through setup steps (`ABOUT_ME` → `STORE_CREATION` → `COMPLETED`). Orchestrates Users and Store modules atomically via UoW. |
| **Storefront Auth** | [`modules/storefront-auth`](apps/core/src/modules/storefront-auth/README.md) | Tenant-scoped customer authentication using stateful Redis sessions. Includes login, logout, password reset, brute-force protection (account lockout + sliding-window rate limiting), and cross-tenant isolation. |
| **Storefront Users** | `modules/storefront-users` | Customer profile management scoped to a specific store. |
| **Categories** | `modules/categories` | Product category taxonomy per store. |
| **Notifications** | `modules/notifications` | Email/notification delivery, wired into BullMQ for async processing. |
| **Webhooks** | `modules/webhooks` | Ingestion of external provider webhooks (e.g., Clerk user events via Svix signature verification). |
| **Queue** | `modules/queue` | Shared BullMQ infrastructure, processor registration, and queue utilities. |
| **Currency** | `modules/currency` | Currency definitions and conversion support. |
| **Health** | `modules/health` | Health check endpoints. |

### `@ferrite/pulse` — Storefront PWA [`apps/pulse`](apps/pulse)

Next.js storefront with PWA support (via Serwist). Consumes the `@ferrite/api` and `@ferrite/react` packages.

---

## Packages

| Package | Description |
|---|---|
| [`@ferrite/api`](packages/api) | Typed API client for the core backend |
| [`@ferrite/react`](packages/react-sdk) | React SDK — hooks and context providers for storefront UIs |
| [`@ferrite/schema`](packages/schema) | Shared Zod schemas for types used across apps and packages |
| [`@ferrite/config`](packages/config) | Shared tooling configs (TypeScript, ESLint, etc.) |

---

## Key Design Decisions

- **Dual Auth Realms**: Platform admins authenticate via Clerk JWTs; storefront customers use per-store Redis session cookies. The global `AuthGuard` dispatches to the correct adapter via `@UseRealm()` — zero if/else branching.
- **Transactional Outbox**: Profile/metadata mutations are written alongside a queue event in a single DB transaction, ensuring eventual consistency with external IdPs without risk of data loss.
- **Sliding-Window Rate Limiting**: Critical storefront auth endpoints (login, registration, password reset) are protected by a Redis ZSET-backed sliding-window algorithm, executed atomically via `MULTI`.
- **Unit of Work**: Cross-module operations (e.g., onboarding provisioning a store) share a single database transaction via the `IUnitOfWork` abstraction without leaking Drizzle types across module boundaries.

---

## Getting Started

```bash
# Install dependencies
bun install

# Start all apps (dev)
bun run dev

# Build all apps
bun run build

# Run tests (core)
cd apps/core && bun test
```

> [!NOTE]
> Requires a running PostgreSQL instance and Redis. Copy `.env.example` to `.env` and configure your connection strings before starting.
