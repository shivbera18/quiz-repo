---
name: gateway-route-and-rate-limit
description: Add or debug API gateway proxy prefixes, public-route rules, auth header propagation, token introspection, CORS, trace IDs, downstream failures, and Redis rate-limit policies.
---

# Gateway Routes and Rate Limits

Keep the gateway's public surface explicit and prevent trust-header spoofing.

## Entry points

- Routing/auth hook: `apps/gateway/src/index.ts`.
- Introspection: `apps/gateway/src/auth.ts`.
- Policies: `apps/gateway/src/rate-limit.ts`.
- Redis primitives: `packages/redis-kit/src/rateLimit.ts` and `keys.ts`.
- Service URLs: `infra/docker-compose.yml` and env examples.

## Adding or changing a route

1. Identify the owning service and exact method/path.
2. Add the narrowest proxy prefix. Check collisions with existing `/v1/admin/*` prefixes.
3. Decide explicitly whether it is public. Default to authenticated.
4. Public catalog routes must never expose the internal full-quiz answer-key endpoint.
5. Ensure downstream service independently enforces authorization and resource ownership.
6. Preserve query strings, body, method, expected statuses, and `x-trace-id`.
7. Strip caller-supplied `x-user-id`, `x-user-name`, `x-user-email`, and `x-user-is-admin` before injecting trusted values.
8. Add a route-specific rate limit when cost or abuse differs from normal traffic.

## Rate-limit design

- Choose identity key deliberately: IP for anonymous/login/signup, user for authenticated expensive operations, resource/attempt for autosave and submit.
- Normalize email before using it as a key without storing raw sensitive values when hashing is available.
- Use atomic Redis operations and deterministic TTL behavior.
- Return `429` and useful retry metadata consistently.
- Decide and document fail-open versus fail-closed behavior for Redis outages per endpoint risk.
- Avoid unbounded key cardinality from arbitrary path/scope input.

## Public-route review

Any change to `isPublicRoute` requires negative tests for nearby paths, encoded paths, trailing slashes, unsupported methods, and prefix confusion. A GET being public does not imply POST/PATCH/DELETE are public.

## Verification

```bash
pnpm --filter gateway typecheck
pnpm --filter @quiz/redis-kit typecheck
```

Test requests with no auth, invalid auth, forged trust headers, valid student/admin users, rate-limit boundary, and unavailable identity/Redis/downstream services.
