---
name: analytics-rollups
description: Change or debug analytics projections, attempt facts, quiz and user statistics, streaks, cache invalidation, and event-driven rollups in analytics-svc.
---

# Analytics Rollups

Maintain deterministic, replay-tolerant read models derived from domain events.

## Entry points

- Consumer: `apps/analytics/src/rollup-consumer.ts`.
- Query API: `apps/analytics/src/index.ts`.
- Models: `apps/analytics/prisma/schema.prisma`.
- Redis keys/helpers: `packages/redis-kit/src/keys.ts` and `leaderboard.ts`.
- Contracts: attempt, quiz, chapter, subject, and user events in `packages/contracts`.
- UI: `apps/web/app/analytics/` and `apps/web/app/admin/analytics/`.

## Projection rules

- `assessment-svc` emits attempt facts with `chapterId` and `subjectId` null because catalog owns those relationships.
- Resolve dimensions from analytics-owned `DimQuiz`, `DimChapter`, and `DimSubject` projections.
- Kafka ordering exists only within a topic/partition. A quiz event can arrive before its chapter or subject event; reconciliation must tolerate and repair stale/null dimensions.
- Deduplicate by event ID transactionally with projection updates.
- Replaying an event must not increment attempts, unique users, scores, or streaks twice.
- Preserve historical attempt facts when users or catalog content change; apply the documented erasure/redaction policy rather than destructive joins.
- Invalidate all affected Redis cache keys only after successful database state changes.

## Workflow

1. Write the rollup formula and replay behavior before editing code.
2. Check create and update branches of every Prisma upsert; they must compute equivalent state.
3. Review zero-attempt, null dimension, deleted content, late event, duplicate event, and out-of-order event behavior.
4. For averages, track sum/count consistently and avoid averaging averages.
5. For streaks, define UTC/local-date semantics and test day boundaries.
6. If event semantics change, plan projection rebuild/backfill and compatibility with existing events.
7. Verify API cache keys correspond to every changed projection.

## Verification

```bash
pnpm --filter analytics-svc prisma:generate
pnpm --filter analytics-svc typecheck
pnpm --filter @quiz/redis-kit typecheck
pnpm --filter @quiz/contracts typecheck
```

Prefer fixture-driven consumer tests for duplicates, cross-topic ordering, and replay. Report whether existing projections require rebuild or backfill.
