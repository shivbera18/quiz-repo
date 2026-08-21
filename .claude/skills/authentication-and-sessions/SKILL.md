---
name: authentication-and-sessions
description: Master skill for user signup, login, opaque token format, token introspection, role enforcement, gateway auth header scrubbing, password handling, and session state. Trigger whenever editing identity-svc routes in apps/identity/src/index.ts, modifying gateway auth caching in apps/gateway/src/auth.ts, updating User model in identity/prisma/schema.prisma, or working on auth UI in apps/web.
---

# Authentication & Session Management

Authentication is terminated ONCE at `apps/gateway` (port 4000). Downstream microservices NEVER parse bearer tokens — they rely entirely on trusted `x-user-*` HTTP headers injected by the gateway after token introspection.

## Architecture & Entry Points

- **Identity Service API:** `apps/identity/src/index.ts` (port 4001).
- **Outbox Publisher:** `apps/identity/src/outbox-store.ts` (in-process publisher, 2s interval).
- **Gateway Introspection Engine:** `apps/gateway/src/auth.ts` (`introspectToken`).
- **Gateway Auth Hook:** `apps/gateway/src/index.ts` (`rewriteRequestHeaders`).
- **Contracts DTOs:** `packages/contracts/src/dto/auth.ts` (`loginRequestSchema`, `signupRequestSchema`, `TokenIntrospectionDTO`).
- **Prisma Model:** `User`, `Outbox` in `apps/identity/prisma/schema.prisma`.
- **Frontend Hook:** `apps/web/hooks/use-auth.tsx`.

## Token Scheme & Parsing

- **Format:** `${userId}-${Date.now()}-${random36}`.
- **Parsing:** `parseToken()` splits on the **last two dashes** because UUID user IDs contain dashes.
- **Expiry:** Maximum token age is **30 days**.
- **Storage:** Opaque tokens are stateless strings. Invalidation is handled by Redis token cache eviction.

## Identity Routes (`apps/identity/src/index.ts`)

1. **`POST /v1/auth/login`:**
   - Validates `loginRequestSchema`. Checks user existence & compares password.
   - Cross-checks `userType`/`isAdmin` (returns 403 on role mismatch).
   - In ONE transaction: updates `lastLogin` date AND inserts an Outbox `USER_CHANGED` event.
   - Returns `{ token, user }`.
2. **`POST /v1/auth/signup`:**
   - Validates `signupRequestSchema`. Returns 400 if email exists.
   - Creates user with `isAdmin: false, userType: "student"`.
   - In ONE transaction: creates `User` AND inserts Outbox `USER_CHANGED` event.
3. **`POST /v1/internal/introspect` (INTERNAL ONLY):**
   - Receives `{ token }`. Returns `{ valid, userId, name, email, isAdmin }`.
   - NEVER throws on invalid/expired tokens — returns `{ valid: false }`.
4. **`GET /v1/internal/users` & `GET /v1/users/:id`:** Internal user lookups for legacy reporting.

## Gateway Auth & Header Injection (`apps/gateway/src/auth.ts`)

```
Browser Request (Authorization: Bearer <token>)
                      │
                      ▼
Gateway: Check Redis q:auth:token:<token> (120s TTL)
   ├── Cache Hit  ──▶ Use cached JSON
   └── Cache Miss ──▶ Call POST identity-svc:4001/v1/internal/introspect
                      Cache result for 120s (Negative results cached as "")
                      │
                      ▼
Gateway: Header Scrubbing & Rewrite
   ├── SCRUB:  x-user-id, x-user-name, x-user-email, x-user-is-admin, expect
   └── INJECT: x-user-id, x-user-name, x-user-email, x-user-is-admin
                      │
                      ▼
Proxy to Downstream Microservice (Downstream trusts x-user-* headers)
```

## Authorization in Microservices (`auth.ts`)

Downstream services use helper functions reading `x-user-*` headers:
- `requireUser(request)`: Returns `{ userId, name, email, isAdmin }` or throws 401.
- `requireAdmin(request)`: Checks `x-user-is-admin === "true"` or throws 403.

## Verification Checklist

```bash
pnpm --filter identity-svc prisma:generate
pnpm --filter identity-svc typecheck
pnpm --filter gateway typecheck
```

- Verify `parseToken` correctly splits tokens when `userId` is a UUID containing dashes.
- Verify gateway strips caller-supplied `x-user-is-admin` header on public requests.
- Verify `USER_CHANGED` outbox event is committed in the same transaction as user creation/login.
