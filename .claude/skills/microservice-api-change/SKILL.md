---
name: microservice-api-change
description: Add, modify, or debug Fastify endpoints and service logic in the quiz-platform backend. Use for gateway routing, authentication, validation, catalog, assessment, identity, analytics, notification, or cross-service API changes.
---

# Microservice API Change

Make backend API changes without violating service ownership.

## Service ownership

- `apps/gateway`: public entry point, auth introspection, rate limiting, and forwarding.
- `apps/identity`: users, login, sessions, and token validation.
- `apps/catalog`: subjects, quizzes, questions, and AI quiz generation.
- `apps/assessment`: attempts, answer submission, timing, and server-side scoring.
- `apps/analytics`: reports, read models, leaderboards, and exports.
- `apps/notification`: notifications, SSE, push delivery, and fanout.

Each stateful service owns its Prisma schema. Do not query another service's schema directly.

## Workflow

1. Trace the full request path: web caller → gateway → owning service → persistence/events.
2. Read the service's `src/index.ts`, auth helper, nearby routes/functions, package scripts, and relevant Zod contracts.
3. Define or update request and response schemas in `packages/contracts`; validate at the service boundary.
4. Enforce authentication and authorization in the owning service, even when the gateway already checks identity.
5. Keep business invariants in service logic, not only handlers or the UI.
6. Update gateway forwarding when a public route, method, headers, query string, timeout, or status mapping changes.
7. Preserve `x-trace-id` and required auth headers across service calls.
8. Add tests for success, invalid input, unauthenticated/forbidden access, not-found behavior, and important conflicts.

## API rules

- Return consistent status codes and stable, non-sensitive errors.
- Never accept client-calculated quiz scores as authoritative.
- Make retried writes idempotent where duplicate requests are plausible.
- Set explicit timeouts and handle non-2xx downstream responses.
- For asynchronous side effects, use events/outbox rather than fragile fire-and-forget calls.
- Do not silently create cross-service database coupling.

## Verification

Use the actual package name shown in its `package.json`, for example:

```bash
pnpm --filter @quiz/contracts typecheck
pnpm --filter gateway typecheck
pnpm --filter assessment-svc typecheck
pnpm --filter assessment-svc test
```

Then run `pnpm typecheck` or `pnpm build` if the change crosses packages. State which services, routes, contracts, and checks were affected.
