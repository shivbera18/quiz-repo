---
name: analytics-rollups
description: Master skill for event-driven analytics projections, attempt facts, question statistics, streaks, daily rollups, cache invalidation, and read-model event consumers. Trigger whenever modifying analytics-svc, editing rollup-consumer.ts, altering analytics Prisma models, updating projection rules for Kafka events, or working on analytics API routes.
---

# Analytics Rollups & Event Projections

`apps/analytics` (port 4004) owns zero authoritative data. All 15 of its tables are derived read models (projections) fed by 7 Kafka topics. The entire schema can be rebuilt by resetting the consumer group offset to 0.

## Entry Points & Processes

- **API Server:** `apps/analytics/src/index.ts` (port 4004).
- **Rollup Consumer Worker:** `apps/analytics/src/rollup-consumer.ts` (`groupId: "analytics-rollup-consumer"`).
- **Export Worker:** `apps/analytics/src/export-worker.ts`.
- **Prisma Models:** `apps/analytics/prisma/schema.prisma` (15 models).
- **Redis Kit Helpers:** `packages/redis-kit/src/keys.ts` and `leaderboard.ts`.

## The 15 Projection Models

`DimUser`, `DimQuiz`, `DimChapter`, `DimSubject` (dimension projections) · `AttemptFact`, `AttemptSectionFact` (denormalized facts) · `QuestionStat` (option selection counts, `pValue`, `avgTimeMs`) · `UserStats` (rolling `last20Scores`, streak days) · `QuizStats` (`passCount` where score ≥ 40%) · `DailyRollup` (aggregated metrics) · `UserDailyActivity` · `QuizUserSeen` (`ON CONFLICT DO NOTHING` unique user tracker) · `ExportJob` · `ProcessedEvent` (idempotency) · `BackfillState`.

## Transactional Idempotency Pattern

Every event handler MUST check and mark processed inside the projection transaction:

```ts
await prisma.$transaction(async (tx) => {
  if (await tx.processedEvent.findUnique({ where: { id: eventId } })) {
    return; // Already applied
  }
  // 1. Perform projection updates...
  // 2. Mark event as processed in the SAME transaction:
  await tx.processedEvent.create({
    data: { id: eventId, eventType, processedAt: new Date() }
  });
});
```

A primary key violation on `ProcessedEvent` rolls back the entire transaction, guaranteeing replay safety.

## Handler Logic & Event carried State Transfer

1. **`handleAttemptSubmitted`:**
   - Emitted attempt facts have `chapterId` and `subjectId` set to `null` by assessment-svc. Analytics resolves them from its local `DimQuiz` & `DimChapter` dimensions.
   - Writes `AttemptFact`, `AttemptSectionFact`, `QuestionStat` (`optionCounts` map including `"unanswered"`), `QuizUserSeen` (via `INSERT ... ON CONFLICT DO NOTHING`), `QuizStats`, `UserStats` (streaks & rolling 20 scores), and **3 `DailyRollup` buckets** (`quiz+__all__`, `__all__+subject`, `__all__+__all__`).
   - Outside transaction (best-effort): calls `recordLeaderboardEntry` (ZADD `GT`) and invalidates affected Redis cache keys (`q:cache:analytics:*`).
2. **`handleQuizChanged`:** Upserts `DimQuiz`. Busts quiz and overview cache keys.
3. **`handleChapterChanged`:** Upserts `DimChapter` and calls `dimQuiz.updateMany` to re-resolve stale `subjectId` for quizzes that arrived before their chapter event (out-of-order handling).
4. **`handleUserChanged`:** Upserts `DimUser`.
5. **`handleUserErasureRequested`:** Scrubs `DimUser` (`name` & `email` set to `"[erased]"`). Historical `AttemptFact` rows ARE NOT deleted (deliberate historical denormalization).

## Analytics API & Caching

- `GET /v1/analytics/overview`: Redis cache-aside with TTL **300s** (`keys.cacheAnalyticsOverview()`). Reads 30-day `DailyRollup` where `quizId="__all__"` and `subjectId="__all__"`.
- `GET /v1/analytics/quizzes`: Bulk `QuizStats` by `?ids=a,b,c`. (Used by admin quiz UI because catalog intentionally omits stats).
- `GET /v1/analytics/quizzes/:id`: Detailed quiz stats, section breakdown, and question `pValue` / `avgTimeMs`.
- `GET /v1/analytics/users/:id`: `UserStats` and 90-day `UserDailyActivity`.

## Verification Checklist

```bash
pnpm --filter analytics-svc prisma:generate
pnpm --filter analytics-svc typecheck
pnpm --filter @quiz/redis-kit typecheck
```

- Verify duplicate Kafka event IDs are ignored without error or double-increment.
- Verify `handleChapterChanged` correctly updates `DimQuiz` rows when events arrive out of order.
- Verify Redis cache keys are invalidated after projection database commits.
