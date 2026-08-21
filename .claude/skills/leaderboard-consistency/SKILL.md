---
name: leaderboard-consistency
description: Master skill for Redis sorted set leaderboards, tie-breaking score encoding, leaderboard ranking queries, weekly rotation, and leaderboard consistency with analytics facts. Trigger whenever editing packages/redis-kit/src/leaderboard.ts, modifying leaderboard API routes in apps/analytics/src/index.ts, or adjusting score recording logic in rollup-consumer.ts.
---

# Leaderboard Consistency & Ranking

Leaderboards run on Redis Sorted Sets (ZSETs). Scores are recorded asynchronously by `analytics-svc`'s `rollup-consumer` upon receiving an `ATTEMPT_SUBMITTED` event.

## Key Builders & Redis Primitives

All leaderboard keys are constructed in `packages/redis-kit/src/keys.ts`:

- `q:lb:quiz:<id>` - Per-quiz ZSET.
- `q:lb:subject:<id>` - Per-subject ZSET.
- `q:lb:global` - Global all-time ZSET.
- `q:lb:weekly:<YYYY-Www>` - Weekly ZSET (TTL: **9 days**).
- `q:lb:names` - Hash mapping `userId -> userName` for fast display name resolution without database joins.

## Tie-Breaking Score Encoding

Leaderboards rank by accuracy first, then speed (faster attempts rank higher for equal scores). This is achieved via a single floating-point score encoding function (`encodeLeaderboardScore` in `packages/redis-kit/src/leaderboard.ts`):

```ts
const score = Math.round(scorePct * 100) * 1_000_000 + (999_999 - Math.min(timeSpentSec, 999_999));
```

- **Accuracy component:** `round(scorePct * 100) * 1_000_000` (e.g. 85.5% → 855000000).
- **Time component:** `999_999 - min(timeSpentSec, 999_999)` (e.g. 120s → 999879).
- **Precision Guarantee:** Max score ~1.0e13, well inside IEEE 754 float64 exact-integer limit ($2^{53} \approx 9.0 \times 10^{15}$).
- **Decoding:**
  - `scorePct = Math.floor(score / 1_000_000) / 100`
  - `timeSpentSec = 999_999 - (Math.floor(score) % 1_000_000)`

## Best Attempt Update Rule (`ZADD ... GT`)

To enforce "best attempt counts" without read-modify-write race conditions, updates use Redis pipeline with the `GT` flag (`Greater Than`):

```ts
pipeline.zadd(key, "GT", score, userId);
```

If the user's new attempt has a lower score, Redis ignores the update atomically.

## Implicit Weekly Rotation

Weekly leaderboards use ISO week string keys (e.g. `q:lb:weekly:2026-W34`).
- Setting `EXPIRE 9 days` ensures old weekly keys auto-cleanup.
- No cron job or reset script is required; Monday midnight cleanly switches to the new ISO week key.

## Retrieval API (`GET /v1/leaderboards/:scope`)

- `scope` must be `global`, `weekly`, `quiz:<id>`, or `subject:<id>`. (Returns `400` on invalid scope).
- Parameter `?limit` defaulted 10 (range 1–100).
- Uses `ZREVRANGE ... WITHSCORES` + `HMGET q:lb:names` to return ranked arrays with `rank`, `userId`, `userName`, `scorePct`, and `timeSpentSec`.

## Verification Checklist

```bash
pnpm --filter @quiz/redis-kit typecheck
pnpm --filter analytics-svc typecheck
```

- Verify equal accuracy attempts correctly rank the faster completion higher.
- Verify `ZADD GT` prevents a worse attempt from overwriting a user's high score.
- Verify `HMGET` gracefully falls back to `"Unknown"` if `userName` is absent from `q:lb:names`.
