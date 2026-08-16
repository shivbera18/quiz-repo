---
name: authentication-and-sessions
description: Modify or harden signup, login, tokens, introspection, user roles, gateway auth caching, logout, password storage, and session expiry in identity-svc and the web app.
---

# Authentication and Sessions

Treat identity changes as migrations of security behavior, not isolated endpoint edits.

## Entry points

- Identity API: `apps/identity/src/index.ts`.
- Contracts: `packages/contracts/src/dto/auth.ts`.
- Gateway introspection client: `apps/gateway/src/auth.ts`.
- Auth/rate-limit hook: `apps/gateway/src/index.ts`.
- Redis token-cache keys: `packages/redis-kit`.
- Frontend auth: `apps/web/hooks/use-auth.tsx`, login/signup pages, protected routes, and auth proxies.

## Current risks to account for

The identity service currently compares plaintext passwords and mints predictable unsigned token strings parsed by timestamp. These are documented deferred hardening gaps. Do not extend this design for new security-sensitive features. Work involving auth hardening should migrate to password hashing (Argon2id or bcrypt with appropriate cost) and cryptographically random opaque sessions stored/revocable server-side, or properly signed short-lived tokens plus refresh/session revocation.

## Migration workflow

1. Define session lifetime, idle/absolute expiry, logout, revocation, role changes, and multi-device behavior.
2. Add password hashes alongside legacy passwords if a gradual login-time rehash is required; never log or return either.
3. Use constant-time library verification and generic invalid-credential responses.
4. Normalize email consistently and preserve a database uniqueness constraint.
5. Store only a token hash for opaque sessions where practical.
6. Invalidate gateway introspection cache on logout, revocation, password reset, deletion, and role changes; keep cache TTL below the accepted revocation delay.
7. Ensure direct service access cannot forge `x-user-*` trust headers through the deployment network boundary.
8. Add CSRF protection if moving auth to cookies; use Secure, HttpOnly, SameSite settings appropriate to the deployment.

## Tests

Cover signup duplication races, wrong password, admin/student role mismatch, expired/revoked token, logout, role change with cached introspection, user deletion, malformed token, brute-force rate limiting, and legacy-password migration if applicable.

## Verification

```bash
pnpm --filter identity-svc typecheck
pnpm --filter gateway typecheck
pnpm --filter @quiz/contracts typecheck
pnpm --filter web typecheck
```

Never expose test credentials or live token values in logs/reports. Describe compatibility and forced-login effects explicitly.
