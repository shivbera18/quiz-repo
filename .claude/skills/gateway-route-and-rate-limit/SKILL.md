---
name: gateway-route-and-rate-limit
description: Master skill for Fastify API gateway proxy routing, public route configuration, auth header scrubbing, token introspection caching, Redis rate limiting, and CORS handling. Trigger whenever adding gateway proxy prefixes, editing public route rules in apps/gateway/src/index.ts, modifying token introspection in apps/gateway/src/auth.ts, adjusting rate limit policies in rate-limit.ts, or exposing a new backend microservice endpoint to the web app.
---

# Gateway Routes and Rate Limits

`apps/gateway` (port 4000) is the sole entry point for browser traffic. It terminates authentication, scrubs untrusted headers, applies sliding-window rate limits, and proxies requests to downstream Fastify microservices. It has NO database and NO Kafka client.

## Entry Points & Core Files

- **Proxy Table & Public Routes:** `apps/gateway/src/index.ts`.
- **Auth Introspection:** `apps/gateway/src/auth.ts` (`introspectToken`).
- **Rate Limit Enforcement:** `apps/gateway/src/rate-limit.ts` (`enforceRateLimit`).
- **Redis Rate Limit Policy Engine:** `packages/redis-kit/src/rateLimit.ts` (`SLIDING_WINDOW_LUA`, `RATE_LIMIT_POLICIES`).
- **Redis Key Builders:** `packages/redis-kit/src/keys.ts` (`keys.tokenCache`, `keys.rateLimit`).

## 26 Proxy Prefixes & Upstream Mapping

| Service | Host Port | Gateway Prefixes |
|---|---|---|
| **identity** | `:4001` | `/v1/auth`, `/v1/users` |
| **catalog** | `:4002` | `/v1/subjects`, `/v1/chapters`, `/v1/quizzes`, `/v1/ai`, `/v1/admin/subjects-chapters-quizzes`, `/v1/admin/subjects`, `/v1/admin/chapters`, `/v1/admin/quizzes`, `/v1/admin/question-bank` |
| **assessment** | `:4003` | `/v1/attempts`, `/v1/admin/attempts`, `/v1/legacy-results`, `/v1/legacy-analytics`, `/v1/admin/legacy-analytics`, `/v1/admin/legacy-results`, `/v1/admin/legacy-users`, `/v1/admin/legacy-user-performance` |
| **analytics** | `:4004` | `/v1/analytics`, `/v1/leaderboards`, `/v1/admin/exports` |
| **notification** | `:4005` | `/v1/announcements`, `/v1/admin/announcements`, `/v1/push-subscriptions`, `/v1/stream` |

**Prefix Shadowing Rule:** Register more specific admin routes BEFORE broader prefixes (e.g. `/v1/admin/subjects-chapters-quizzes` must be registered before `/v1/admin/subjects` so `@fastify/http-proxy` does not swallow it).

## Public-Route Security (`isPublicRoute`)

Public routes bypass Bearer authentication:
1. `GET /healthz`, `GET /readyz`
2. `POST /v1/auth/login`, `POST /v1/auth/signup`
3. `GET /v1/stream` (SSE ticket authenticated downstream; SSE standard cannot send `Authorization` headers)
4. `GET /v1/subjects` & `/v1/subjects/*`
5. `GET /v1/chapters` & `/v1/chapters/*`
6. `GET /v1/quizzes` & `GET /v1/quizzes/:id` (`^\/v1\/quizzes\/[^/]+$`)

**Critical Isolation Rule:** `/internal/*` routes are NEVER registered in the proxy table. Answer keys (`/internal/quizzes/:id/full`) and bulk user queries are physically unreachable from the public internet.

## The Security-Critical Auth Pipeline

1. **Check `isPublicRoute()`:** If true, skip Bearer check.
2. **Extract `Authorization: Bearer <token>`:** Check Redis `q:auth:token:<token>`.
   - On cache hit: return cached JSON.
   - On cache miss: Call `POST {IDENTITY_SVC_URL}/v1/internal/introspect` with `{ token }`.
   - Cache result in Redis for **120s** (`keys.tokenCache(token)`). Negative results cached as `""` to prevent DDoS against identity-svc.
3. **Header Scrubbing (`rewriteRequestHeaders`):**
   - **MUST delete** inbound `x-user-id`, `x-user-name`, `x-user-email`, `x-user-is-admin`, and `expect`.
   - **MUST inject** downstream `x-user-id`, `x-user-name`, `x-user-email`, `x-user-is-admin` from introspection result. This guarantees callers cannot forge admin or act as another user.

## Rate Limiting Policies (`RATE_LIMIT_POLICIES`)

Sliding window counter implemented via two-window Lua script in `@quiz/redis-kit`:

| Policy | Limit | Window | Key Subject | Applied At |
|---|---|---|---|---|
| `defaultByIp` | 600 req | 60s | Client IP | All requests |
| `defaultByUser` | 300 req | 60s | `x-user-id` | All authenticated requests |
| `loginByIp` | 50 req | 5m | Client IP | `POST /v1/auth/login` |
| `loginByEmail` | 30 req | 15m | `body.email` | `POST /v1/auth/login` |
| `signupByIp` | 3 req | 60m | Client IP | `POST /v1/auth/signup` |
| `aiGenByUser` | 5 req | 60m | `x-user-id` | `POST /v1/ai/quiz-generations` |
| `exportByUser` | 3 req | 60m | `x-user-id` | `POST /v1/admin/exports` |
| `answersByAttempt` | 120 req | 60s | `params.id` | `PATCH /v1/attempts/:id/answers` |
| `submitByAttempt` | 5 req | 60s | `params.id` | `POST /v1/attempts/:id/submit` |

## Step-by-Step: Exposing a New Endpoint

1. Implement service route in `apps/<svc>/src/index.ts`.
2. Add gateway proxy prefix in `apps/gateway/src/index.ts` (check prefix shadowing).
3. If public, update `isPublicRoute` regex.
4. If expensive/abusive, add or assign a rate limit policy in `apps/gateway/src/rate-limit.ts`.
5. Add route forwarder in `apps/web/app/api/.../route.ts` using `proxyToGateway(req, path)`.

## Verification Checklist

```bash
pnpm --filter gateway typecheck
pnpm --filter @quiz/redis-kit typecheck
```

- Verify spoofed `x-user-is-admin: true` header is stripped and overwritten by gateway.
- Verify `401 Unauthorized` on missing token for protected routes.
- Verify `429 Too Many Requests` on exceeding rate limits.
