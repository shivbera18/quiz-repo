---
name: contracts-and-events
description: Master skill for shared Zod DTOs, Kafka event schemas, topic definitions, producers, consumers, transactional outbox, and inter-service payloads. Trigger whenever changing Zod schemas in @quiz/contracts, adding or modifying Kafka topics, editing outbox-store.ts in any service, updating Kafka consumers or producers in kafka-kit, or modifying data formats that cross microservice boundaries.
---

# Contracts and Events

`packages/contracts` is the single source of truth for all schemas crossing service boundaries. `packages/kafka-kit` provides the Kafka client, consumer runner, and outbox publisher.

## Structure & Exports

- **DTOs (`packages/contracts/src/dto/`):**
  - `auth.ts`: `loginRequestSchema`, `signupRequestSchema`, `TokenIntrospectionDTO`, `AuthUserDTO`.
  - `attempts.ts`: `startAttemptRequestSchema`, `autosaveRequestSchema`, `submitAttemptRequestSchema`, `AttemptQuestionDTO` (NO answer key), `StartAttemptResponseDTO`.
  - `catalog.ts`: Pure interfaces (no Zod): `QuizSummaryDTO`, `FullQuizQuestionDTO` (HAS answer key), `FullQuizDTO`, `SubjectDTO`, `ChapterDTO`.
- **Topics & Events (`packages/contracts/src/events/topics.ts`):** 13 defined topics under `TOPICS`.
- **Envelope (`packages/contracts/src/events/envelope.ts`):** `EventEnvelope<T>` created via `createEnvelope(eventType, data, options)`.
- **Kafka Kit (`packages/kafka-kit/src/`):**
  - `client.ts`: `createKafka`, `getProducer` (singleton, `idempotent: true`, `maxInFlightRequests: 5`).
  - `outbox.ts`: `publishOutboxBatch`, `startOutboxPublisher` (polls every 2s).
  - `consumer.ts`: `runConsumer` (handles subscription, logging, and idempotency pre-check).

## The 13 Kafka Topics

| Key | Topic Name | Producer | Consumer(s) | Keying Strategy | Compaction |
|---|---|---|---|---|---|
| `ATTEMPT_SUBMITTED` | `quiz.assessment.attempt-submitted.v1` | assessment (outbox) | analytics rollup | `userId` | Fact (No) |
| `ATTEMPT_STARTED` | `quiz.assessment.attempt-started.v1` | assessment (direct) | analytics rollup | `userId` | Fact (No) |
| `QUIZ_CHANGED` | `quiz.catalog.quiz-changed.v1` | catalog (outbox) | analytics rollup | `quizId` | Compacted |
| `CHAPTER_CHANGED` | `quiz.catalog.chapter-changed.v1` | catalog (direct) | analytics rollup | `chapterId` | Compacted |
| `SUBJECT_CHANGED` | `quiz.catalog.subject-changed.v1` | catalog (direct) | analytics rollup | `subjectId` | Compacted |
| `USER_CHANGED` | `quiz.identity.user-changed.v1` | identity (outbox) | analytics, notification | `userId` | Compacted |
| `USER_ERASURE_REQUESTED` | `quiz.identity.user-erasure-requested.v1` | identity (direct) | analytics, notification | `userId` | Fact (No) |
| `ANNOUNCEMENT_PUBLISHED` | `quiz.notification.announcement-published.v1` | notification (outbox) | notification worker | `announcementId` | Fact (No) |
| `PUSH_SEND_REQUESTED` | `quiz.notification.push-send-requested.v1` | notification worker | notification worker | `userId` | Fact (No) |
| `AI_QUIZ_GENERATION_REQUESTED` | `quiz.ai.quiz-generation-requested.v1` | catalog (direct) | catalog ai-worker | `jobId` | Fact (No) |
| `AI_QUIZ_GENERATION_COMPLETED` | `quiz.ai.quiz-generation-completed.v1` | catalog ai-worker | none (UI polls DB) | `jobId` | Fact (No) |
| `EXPORT_REQUESTED` | `quiz.analytics.export-requested.v1` | analytics (direct) | analytics export-worker | `jobId` | Fact (No) |
| `EXPORT_COMPLETED` | `quiz.analytics.export-completed.v1` | analytics export-worker | none (UI polls DB) | `jobId` | Fact (No) |

## Standard Event Envelope

Every Kafka payload MUST be wrapped in an `EventEnvelope`:

```ts
interface EventEnvelope<T> {
  eventId: string;       // randomUUID - primary consumer deduplication key
  eventType: string;     // e.g. "quiz.assessment.attempt-submitted.v1"
  eventVersion: number;  // default 1
  occurredAt: string;    // ISO-8601 string
  producer: string;      // e.g. "assessment-svc@1.4.0"
  traceId?: string;      // propagated x-trace-id
  data: T;
}
```

## Transactional Outbox Pattern

Use outbox when database write and event emission MUST be atomic (`ATTEMPT_SUBMITTED`, `QUIZ_CHANGED`, `USER_CHANGED`, `ANNOUNCEMENT_PUBLISHED`).

1. Insert outbox record inside the domain transaction:
   ```ts
   await tx.outbox.create({
     data: {
       id: crypto.randomUUID(),
       topic: TOPICS.ATTEMPT_SUBMITTED,
       key: userId,
       payload: envelope,
       headers: { traceId }
     }
   });
   ```
2. `startOutboxPublisher` polls every 2 seconds using `withClaimedBatch` (`FOR UPDATE SKIP LOCKED` claim + send + `markPublished` in one transaction).
3. Null payloads (`payload: null`) represent **tombstones** on compacted topics for deleted entities.

## Consumer Idempotency Pattern

Every consumer MUST be idempotent on `envelope.eventId`.

- **Strict Pattern (analytics-svc - COPY THIS):** `runConsumer` checks `hasProcessed(eventId)`. Inside the projection transaction, `markProcessed(tx, eventId)` inserts into `ProcessedEvent`. A primary key collision rolls back the entire projection write.
- **Long Handlers:** Consumers with long processing loops (e.g. `catalog-ai-worker`, `analytics-export-worker`) MUST set `maxPollIntervalMs: 15 * 60_000` on the consumer to prevent rebalance evictions during processing.

## Verification Checklist

```bash
pnpm --filter @quiz/contracts typecheck
pnpm --filter @quiz/kafka-kit typecheck
pnpm --filter <producer-service> typecheck
pnpm --filter <consumer-service> typecheck
```

- Verify new events use `createEnvelope` and include `eventId` + `occurredAt`.
- Verify outbox implementation uses `FOR UPDATE SKIP LOCKED`.
- Check topic retention & compaction settings in Redpanda Console (http://localhost:8090).
