---
name: distributed-debugging
description: Master skill for diagnosing cross-service bugs, tracing x-trace-id across microservices, inspecting Redpanda Kafka consumer lag, querying Postgres per role/schema, debugging Redis cache/leaderboards, and tracing MinIO object exports. Trigger whenever investigating bugs spanning web, gateway, microservices, Postgres, Redis, Kafka, workers, SSE, or push notifications.
---

# Distributed Debugging Guide

The platform consists of 12 processes (Web + Gateway + 5 Fastify microservices + 5 Workers) sharing Postgres (5 schemas), Redis, Redpanda Kafka, and MinIO S3.

## End-to-End Request Tracing (`x-trace-id`)

Every HTTP request receives or generates an `x-trace-id` header (`TRACE_HEADER` in `@quiz/observability`).
- **Propagation Path:** Browser → Web App → Gateway → Microservice → Outbox Event Headers → Kafka Message → Consumer Worker → Pino Logger.
- **Log Correlation:** Filter Pino logs across all container logs using the `x-trace-id` string:
  ```bash
  docker compose -f infra/docker-compose.yml logs -f | grep "<trace-id-uuid>"
  ```

## 7-Layer Diagnostic Cascade

```
1. Browser / Web App   ──▶ Network tab (503 = Gateway down; 401 = Auth; 429 = Rate limit)
2. Gateway (:4000)     ──▶ Check introspection cache (q:auth:token:<token>) & rate limit Lua
3. Fastify Svc (:400X) ──▶ Check handleServiceError, traceId binding, Zod validation errors
4. Database (Postgres) ──▶ Check Outbox table (published=false) & schema role search_path
5. Kafka (Redpanda)    ──▶ Redpanda Console (http://localhost:8090) -> Inspect topics & consumer lag
6. Redis (:6380)       ──▶ Inspect keys (q:lb:*, q:rl:*, q:sse:ticket:*)
7. MinIO S3 (:9001)    ──▶ MinIO Console (http://localhost:9001) -> Inspect bucket quiz-exports
```

## Service Connection Cheat-Sheet (Host Side)

```bash
# Postgres connection strings per service schema (Host port 5433):
postgresql://identity_rw:identity_rw_pw@localhost:5433/quiz?schema=identity
postgresql://catalog_rw:catalog_rw_pw@localhost:5433/quiz?schema=catalog
postgresql://assessment_rw:assessment_rw_pw@localhost:5433/quiz?schema=assessment
postgresql://analytics_rw:analytics_rw_pw@localhost:5433/quiz?schema=analytics
postgresql://notification_rw:notification_rw_pw@localhost:5433/quiz?schema=notification

# Infrastructure Web Consoles:
# Redpanda Console (Topics, Consumer Lag, Envelopes): http://localhost:8090
# MinIO Console (S3 Export Buckets):                  http://localhost:9001 (minioadmin / minioadmin)
# Redis Host Connection:                             redis://localhost:6380
```

## Common Symptom Diagnosis Matrix

| Symptom / Error | Root Cause | Resolution Steps |
|---|---|---|
| **503 "Auth service unavailable"** | Gateway cannot reach `identity-svc:4001` or identity DB query timed out. | Check `docker compose logs identity-svc`. Verify Postgres `identity` schema connection. |
| **409 "Quiz modified by another user"** | Optimistic concurrency mismatch in catalog `PATCH /v1/admin/quizzes/:id`. | Reload quiz in admin UI to fetch updated `version` column value. |
| **409 "Attempt in progress"** | `attempt_one_inflight` partial unique index block in `assessment.attempt`. | User already has an `IN_PROGRESS` attempt for this quiz. Must submit or let sweeper expire it. |
| **Events not updating analytics** | Kafka consumer lag or idempotency collision in `ProcessedEvent`. | Check Redpanda Console (http://localhost:8090) consumer group `analytics-rollup-consumer` lag. |
| **SSE connection drops / 401** | Single-use ticket expired (30s) or ticket re-used (`GETDEL`). | Mint a fresh ticket via `POST /v1/stream/tickets` before establishing `EventSource`. |
| **Push notification 410 error** | Browser subscription expired or revoked by push service. | Worker automatically sets `isActive: false` on subscription. Working as intended. |

## Verification Commands

```bash
# Check status of all 12 platform containers:
docker compose -f infra/docker-compose.yml ps

# Check logs for a specific service:
docker compose -f infra/docker-compose.yml logs -f assessment-svc

# Run healthcheck endpoints:
curl http://localhost:4000/healthz
curl http://localhost:4001/healthz
curl http://localhost:4002/healthz
curl http://localhost:4003/healthz
curl http://localhost:4004/healthz
curl http://localhost:4005/healthz
```
