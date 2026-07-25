# Storefront Auth Module

The `storefront-auth` module is responsible for handling store-specific (tenant-level) authentication in the Ferrite platform.

> [!IMPORTANT]
> **Scope Constraint:** This module is solely dedicated to authentication and session management (login, logout, email verification, session validation, and active session tracking). Do **NOT** add user/customer profile management, address books, account settings, or other user data operations to this module. Those concerns belong in a separate user/customer management context.

## Why a separate module?

Ferrite already has a general `auth` module that handles platform-level authentication (using Clerk/JWT) for store owners and administrators. However, **platform auth cannot be used to authenticate tenant-level users** (the customers shopping on a specific storefront).

Storefront users require strict **tenant isolation**. A user registered on Store A should not automatically have access to Store B, even if they use the same email address. The authentication mechanism, rate limits, and configuration (such as session timeouts and lockout policies) also need to be isolated and configurable per store.

Because of these distinct domain boundaries and security requirements, `storefront-auth` is implemented as a standalone module following Hexagonal Architecture principles.

## Session-Based Authentication

Unlike the platform auth which uses stateless JWTs, `storefront-auth` uses **stateful, session-based authentication**.

1. **Login Flow:** When a storefront user logs in successfully, a cryptographically secure random session ID is generated.
2. **Storage:** The session is stored in Redis (as a hash) with metadata such as the `userId`, `storeId`, and tracking information.
3. **Cookie:** The session ID is returned to the client in a secure, `HttpOnly` cookie (e.g., `__sf_session`).
4. **Validation & Bypass:** Because storefront authentication uses session cookies instead of JWTs, the entire `StorefrontAuthController` is decorated with `@PublicRoute()` to bypass the global JWT-based `AuthGuard`.

## Redis Placement & Usage

Redis is a critical piece of infrastructure for the `storefront-auth` module, primarily used for its speed and native expiration capabilities. It is managed internally by the `StorefrontRedisProvider`, which injects an `ioredis` client.

Redis is utilized for two main purposes in this module:

### 1. Session Storage (`RedisStorefrontSessionRepository`)
Sessions are stored using a combination of Redis Hashes and Sets:
- **`sf:session:{sessionId}` (Hash):** Stores the actual session data. It uses `PEXPIRE` for sliding-window idle timeouts.
- **`sf:sessions:{storeId}:{userId}` (Set):** Keeps track of all active session IDs for a specific user within a specific store. This allows us to easily invalidate all sessions for a user (e.g., logging them out of all devices via `LogoutAllUseCase`) by reading the set and pipeline-deleting the hashes.


### 2. Rate Limiting (`RedisRateLimiterAdapter`)
To protect against brute-force attacks and abuse, critical endpoints (like login, registration, and email verification) are heavily rate-limited.

Rate limiting is implemented using a **Sliding Window Algorithm** backed by Redis Sorted Sets (ZSET):
- Each incoming request adds an entry to a sorted set with the current timestamp as its score (`ZADD`).
- Expired timestamps falling outside the configured sliding window are pruned (`ZREMRANGEBYSCORE`).
- The cardinality of the set (`ZCARD`) determines how many requests have been made within the current window.
- This is all executed atomically using a Redis `MULTI` transaction.

## Security Controls

- **Account Lockouts:** Repeated failed login attempts will temporarily lock a user's account. This is tracked persistently in the PostgreSQL database via Drizzle ORM (`storefront_users.failed_login_count` and `storefront_users.locked_until`).
- **Timing Attack Prevention:** If a user attempts to log in with an email that does not exist, the system still computes a dummy Argon2 hash to ensure the response time is indistinguishable from a valid login attempt.
- **Strict Tenant Verification:** Redis session lookups actively verify that the `storeId` in the session matches the `storeId` of the current request, preventing cross-tenant cookie injection attacks.
