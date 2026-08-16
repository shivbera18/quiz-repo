---
name: distributed-debugging
description: Diagnose bugs spanning the web app, gateway, Fastify services, PostgreSQL, Redis, Kafka/Redpanda, MinIO, workers, SSE, or push notifications in the quiz-platform distributed system.
---

# Distributed Debugging

Debug from evidence and follow one request or event end to end.

## Method

1. Reproduce the symptom and record the exact request, user role, attempt/quiz ID, timestamp, expected result, and actual result without exposing secrets.
2. Determine whether the path is synchronous or asynchronous.
3. Trace synchronous flows:
   - browser/network request;
   - Next.js proxy or gateway client;
   - gateway auth/rate-limit/forwarding;
   - owning service validation and authorization;
   - Prisma/Redis operation and response.
4. Trace asynchronous flows:
   - domain transaction and outbox row;
   - outbox publisher;
   - Kafka topic and event envelope;
   - consumer group/worker;
   - idempotency state and side effect;
   - SSE/push/read-model delivery.
5. Correlate logs using `x-trace-id`, event ID, aggregate ID, and timestamps.
6. Form one falsifiable hypothesis at a time and use the cheapest command or focused instrumentation to test it.
7. Fix the root cause, add a regression test, and remove temporary noisy logging.

## Common checks

- Container/process health and restart loops.
- Host URL versus Compose service URL mismatch.
- Stale generated Prisma client or unapplied migration.
- Contract validation failure after producer/consumer drift.
- Outbox rows stuck, retried, or marked incorrectly.
- Consumer group offset/rebalance behavior.
- Duplicate delivery without idempotency.
- Redis key namespace/TTL mistakes.
- Expired attempts, clock/time-zone assumptions, or race conditions.
- SSE disconnect/reconnect and push subscription state.
- MinIO bucket, credentials, object key, or signed URL problems.

## Guardrails

- Redact authorization headers, cookies, passwords, tokens, push endpoints, and personal data.
- Do not "fix" incidents by clearing Redis, resetting Kafka offsets, deleting outbox rows, or dropping data without explicit approval and impact analysis.
- Do not mask readiness issues by weakening health checks.
- Preserve enough structured context in logs to correlate failures, but never log answer keys or secrets.

## Verification

Re-run the smallest reproduction, then relevant typechecks/tests. For race, retry, or idempotency bugs, verify repeated execution. Report evidence, root cause, fix, validation, and remaining uncertainty separately.
