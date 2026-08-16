---
name: leaderboard-consistency
description: Implement or diagnose global, subject, chapter, and quiz leaderboard ranking, Redis sorted sets, cache keys, ties, updates, and consistency with analytics facts.
---

# Leaderboard Consistency

Keep ranking semantics explicit and Redis updates replay-safe.

## Entry points

- API: `GET /v1/leaderboards/:scope` in `apps/analytics/src/index.ts`.
- Event updates: `apps/analytics/src/rollup-consumer.ts`.
- Redis helpers: `packages/redis-kit/src/leaderboard.ts`.
- Key builders: `packages/redis-kit/src/keys.ts`.
- Gateway prefix: `/v1/leaderboards`.

## Workflow

1. Define the scope syntax and reject malformed scopes instead of creating arbitrary Redis keys.
2. Define score semantics: best score, cumulative score, average, latest, or another metric. Do not mix semantics between API and consumer.
3. Define tie ordering and whether ranks are ordinal, dense, or competition ranks.
4. Ensure duplicate `ATTEMPT_SUBMITTED` events cannot apply the same score twice.
5. If updating a user's best score, make comparison/update atomic; avoid read-then-write races.
6. Keep user display data outside or alongside the ranking structure without embedding sensitive fields in public results.
7. Bound result size and validate pagination/top-N limits.
8. Reconcile Redis from Postgres projections after cache loss rather than treating Redis as irreplaceable truth.

## Failure cases

Test equal scores, negative-marked scores, repeated attempts, deleted/renamed users, missing dimensions, Redis restart, concurrent submissions, malformed scope, empty board, and event replay.

## Verification

```bash
pnpm --filter @quiz/redis-kit typecheck
pnpm --filter analytics-svc typecheck
pnpm --filter gateway typecheck
```

For behavior changes, compare API output with analytics facts for a fixed fixture and document ranking/tie rules.
