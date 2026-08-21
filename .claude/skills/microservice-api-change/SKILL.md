---
name: microservice-api-change
description: Master skill for adding, modifying, or debugging Fastify API endpoints and microservice logic across identity, catalog, assessment, analytics, and notification services. Trigger whenever editing Fastify service routes, adding internal HTTP endpoints, handling Zod DTO validation, implementing handleServiceError, configuring trace IDs, or setting up graceful shutdown handlers.
---

# Microservice API Changes

All backend services are built on **Fastify 5** in TypeScript (`strict: true`, ESM). There are 5 Fastify microservice processes running on host ports `4001–4005`.

## Microservice Architecture & Port Map

| Service | Port | Database Schema | Outbox Publisher | Primary Domain |
|---|---|---|---|---|
| `identity-svc` | `:4001` | `identity` | In-process (2s) | Users, login, signup, introspection |
| `catalog-svc` | `:4002` | `catalog` | In-process (2s) | Subjects, chapters, quizzes, question bank |
| `assessment-svc` | `:4003` | `assessment` | Worker process | Attempts, snapshots, scoring, legacy stats |
| `analytics-svc` | `:4004` | `analytics` | None (Read models) | Projections, leaderboards, CSV exports |
| `notification-svc` | `:4005` | `notification` | In-process (2s) | Announcements, SSE, push subscriptions |

## Service Conventions & Standard Boilerplate

Every microservice `src/index.ts` MUST implement these standard capabilities:

1. **Health Check Endpoints:**
   - `GET /healthz`: Static `{ status: "ok" }`. (Used by Docker `healthcheck`).
   - `GET /readyz`: DB health query (`SELECT 1`). Returns `503 Service Unavailable` on database connection failure.
2. **Trace ID Tracking (`@quiz/observability`):**
   - Registers `onRequest` hook: `request.traceId = getOrCreateTraceId(request.headers[TRACE_HEADER])`.
   - Injects `traceId` into pino loggers and downstream fetch headers.
3. **Auth Context via Trusted Headers (`auth.ts`):**
   - Services MUST NOT parse Bearer JWTs. Read trusted headers injected by gateway: `x-user-id`, `x-user-name`, `x-user-email`, `x-user-is-admin`.
   - Use `requireUser(request)` (401) or `requireAdmin(request)` (403).

## Standard Error Handler (`handleServiceError`)

Services use custom domain errors mapped via `handleServiceError`:

```ts
export function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof NotFoundError) {
    return reply.status(404).send({ message: error.message });
  }
  if (error instanceof ForbiddenError) {
    return reply.status(403).send({ message: error.message });
  }
  if (error instanceof ConflictError) {
    return reply.status(409).send({ message: error.message }); // Optimistic locking / state conflict
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({ message: "Validation error", errors: error.errors });
  }
  request.log.error(error);
  return reply.status(500).send({ message: "Internal server error" });
}
```

## Internal Endpoints (`/internal/*`)

- Internal routes (e.g. `GET catalog-svc/internal/quizzes/:id/full`, `POST identity-svc/v1/internal/introspect`) are reserved for service-to-service communication.
- **SECURITY INVARIANT:** Internal routes MUST NEVER be registered in `apps/gateway/src/index.ts`. They are physically unreachable from browser clients.

## Graceful Shutdown Boilerplate

All Fastify servers MUST handle termination signals gracefully:

```ts
const shutdown = async () => {
  stopOutboxPublisher();
  await fastify.close();
  await prisma.$disconnect();
  await producer.disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

## Verification Checklist

```bash
pnpm --filter <service-package> typecheck
docker compose -f infra/docker-compose.yml exec <service-name> pnpm db:migrate
```

- Verify health endpoints `/healthz` and `/readyz` return 200 OK.
- Verify new endpoint uses Zod DTO schema validation from `@quiz/contracts`.
- Verify new errors map to standard HTTP codes (400, 401, 403, 404, 409).
