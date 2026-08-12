# Architecture & Scalability Overhaul

> A working design document for migrating this project from a single Next.js deployable to an
> event-driven, service-oriented architecture. Written to be executed in order, and to be
> defended in detail. Phase 0 is a live security checklist — see the caveat at the end of it.

## Context

This repo is a Next.js 14 App Router monolith (32 pages, 47 API routes, ~5,300 lines of route code) on Vercel with Prisma 6 → Neon Postgres. Frontend and backend share one deployable.

Two goals: remove that coupling so it can scale, and introduce the distributed-systems components — Redis, Kafka, async workers — that the current design has no place for.

**The bottleneck is not the shared server. It's the code.** An honest audit found:

| Problem | Evidence |
|---|---|
| **Scoring is 100% client-side** | `app/api/quizzes/[id]/route.ts` ships `correctAnswer` to the browser; `app/quiz/[id]/page.tsx:236-283` computes the score; `app/api/results/route.ts:82` writes the client's `totalScore` verbatim. Every score in the DB is a client assertion. |
| **Authorization is bypassable** | ~20 admin routes check only `token.length < 10` (`app/api/admin/users/route.ts:14`, `app/api/admin/subjects/route.ts:15`, …). The `*-token-placeholder` fallbacks hardcoded in ~15 client files satisfy that check. |
| **A credential was committed** | `.env.production` is tracked (`git ls-files` confirms). `.gitignore:29` is exact-match `.env`; `:30` is `.env*.local`. Neither covers it. `app/api/debug/env/route.ts` also returns the first 50 chars of `DATABASE_URL` unauthenticated. |
| **Zero aggregate queries in the entire app** | No `groupBy`/`aggregate`/raw SQL anywhere. `/api/admin/quizzes` runs `quiz.findMany({include:{results:true}})` — every quiz + every attempt + every answer blob. `/api/admin/analytics` full-scans `QuizResult` then does an O(results×quizzes) JS join. `/api/admin/users` is O(users×results). |
| **`QuizResult` has zero indexes** | Every query filters `userId` and orders by `date`. All sequential scans. |
| **Unbounded inline fan-out** | `lib/push-notification-utils.ts:167-228` — nested `Promise.all`, one HTTP send **plus** one DB UPDATE per subscription, awaited inside `POST /api/announcements`. |
| **Serial LLM calls in a request** | `app/api/ai/generate-quiz/route.ts:120-233` loops sections calling Gemini serially, and `return`s 500 on the first failure — **discarding every section already generated**. |
| **Nothing is cacheable** | 29 routes set `dynamic='force-dynamic'`, most set `no-store`, ~10 client fetches append `?t=${Date.now()}`. Any cache layer added today is bypassed by construction. |
| **No safety net** | `next.config.mjs` sets `ignoreBuildErrors: true` **and** `ignoreDuringBuilds: true`. Zero tests. Zero CI. |

Two things to internalise before starting:

1. **Splitting the server does not fix any of the above.** Extract these routes as-is and you get a distributed system with the same bugs plus network partitions. Phases 0–6 fix the app; Phase 10 splits it.
2. Any project document claiming NextAuth, SWR, middleware, a test suite, CI/CD, a `QuizAttempt` model, or "database indexing on commonly queried fields" is describing a system that does not exist yet. This document describes what exists and what is planned, and keeps the two labelled.

---

## Target architecture

```
                    ┌─────────────┐
   browser ────────▶│   gateway   │  Fastify. Verifies RS256 JWT once, checks Redis
                    │  (Fastify)  │  denylist, rate-limits, routes, propagates trace-id
                    └──────┬──────┘
        ┌──────────┬───────┼────────────┬──────────────┐
        ▼          ▼       ▼            ▼              ▼
   identity   catalog   assessment  analytics    notification
      -svc      -svc       -svc        -svc          -svc
        │       + ai-      + worker   + rollup-     + worker
        │        worker               consumer      (SSE host)
        │                             + export-
        │                               worker
        └──────────┬───────┴────────────┴──────────────┘
                   │
        ┌──────────┼──────────┬──────────────┐
        ▼          ▼          ▼              ▼
    Postgres    Redis     Redpanda       MinIO
   (5 schemas, (cache,   (Kafka API)   (exports,
    5 roles)   sessions,               question images)
               leaderboards)
```

`apps/web` (the existing Next.js app) becomes UI-only — no `app/api/**` after Phase 10.

### Services, and why each boundary exists

Boundaries are justified by **failure domain / scaling profile / data ownership** — not by "it's a noun in the domain."

| Service | Deployables | Owns | Why this boundary |
|---|---|---|---|
| `gateway` | 1 | nothing | Single public surface; the only place the token denylist is checked, so the auth review is one file. |
| `identity-svc` | 1 | users, sessions, RSA signing key | **Blast radius.** The only process holding the JWT private key and able to read password hashes. This is an isolation argument, *not* a scaling one. |
| `catalog-svc` | 2 (api + `ai-worker`) | subjects, chapters, quizzes, question bank | Write-rare / read-heavy, and the sole holder of answer keys. A 30–120s Gemini job cannot share a request thread pool with a 5ms quiz list. |
| `assessment-svc` | 2 (api + `worker`) | attempts, answers, snapshots, scoring | **The only high-write path** (autosave ≈ 1 write/student/2s during a live exam) and the only service where a bug loses user work. Worker = write-behind flusher + expiry sweeper + outbox publisher. |
| `analytics-svc` | 3 (api + `rollup-consumer` + `export-worker`) | read models, rollups, leaderboards, export jobs | **Owns zero authoritative data.** Every table is rebuildable, so it can be dropped, replayed, reindexed, or relocated with no migration plan. Also the only unboundedly-growing dataset. |
| `notification-svc` | 2 (api + `worker`) | announcements, push subscriptions, SSE connections | **Failure domain** — every slow, flaky, third-party-dependent thing (web-push to Apple/Google/Mozilla) lives here. It also holds long-lived SSE connections, so it can never run on Vercel. |

### Data ownership: one Postgres, schema-per-service, one role per schema

```sql
CREATE SCHEMA identity     AUTHORIZATION identity_rw;
CREATE SCHEMA catalog      AUTHORIZATION catalog_rw;
CREATE SCHEMA assessment   AUTHORIZATION assessment_rw;
CREATE SCHEMA analytics    AUTHORIZATION analytics_rw;
CREATE SCHEMA notification AUTHORIZATION notification_rw;
REVOKE ALL ON SCHEMA catalog FROM assessment_rw, analytics_rw, notification_rw;
ALTER ROLE assessment_rw SET search_path = assessment;   -- repeat per role
```

Not database-per-service. For a solo developer the thing that actually kills these projects is operational surface: five databases means five connection pools, five backup/restore procedures, and five migration states to keep in lockstep during a deploy (and Neon's free tier gives one project).

Schema-per-service with distinct roles buys the **only property that matters architecturally** — a cross-service join is *physically impossible* rather than a code-review convention — at roughly a fifth of the cost. Because each schema has its own Prisma client and its own `_prisma_migrations` table, promoting one to a separate cluster later is `pg_dump -n analytics` plus a connection-string change, not a redesign.

The honest trade-off: a shared cluster is a shared failure domain and shared CPU/IO. `analytics` is the designated first candidate for promotion, because it is the only schema whose row count grows without bound and the only one whose contents are 100% rebuildable — so moving it carries no data risk.

### Cross-service reads — three mechanisms, no fourth

**(a) Immutable snapshot at the boundary.** When an attempt starts, `assessment-svc` makes exactly one synchronous call to `catalog-svc` `GET /internal/quizzes/:id/full` (answer keys included; never gateway-exposed) and writes the result into `assessment.attempt_snapshot`, deduped on `(quizId, contentHash)` so 500 attempts on one mock test store one blob. After that moment assessment never talks to catalog again — not on autosave, not on submit, not on review.

This is not just decoupling. It fixes a real correctness bug for free: **an admin editing a quiz mid-exam can no longer change the questions or the marking scheme under a student's feet.**

**(b) Event-carried state transfer into local projections.** `analytics.dim_user`/`dim_quiz`/`dim_chapter`/`dim_subject` and `notification.user_ref` are local copies fed by compacted topics. Eventually consistent by seconds; every query joins only tables the service owns.

**(c) Deliberate historical denormalization.** `assessment.attempt` freezes `userName`/`userEmail` at attempt time — exactly what `QuizResult` does today. This is correct, not a smell: a result sheet from March should show the name the student had in March. Consequence, stated explicitly: `user-changed` events must **not** backfill attempts. They update only the current-state projections.

There is no mechanism (d). No service calls another on a request-serving hot path. If catalog is down, "start quiz" returns a clean 503 — which is honest, because you genuinely cannot start a quiz whose questions you can't fetch.

---

## The `Attempt` model — server-side scoring

The single most important change in this document.

```prisma
// services/assessment/prisma/schema.prisma
enum AttemptStatus { IN_PROGRESS SUBMITTED EXPIRED ABANDONED }

model Attempt {
  id         String @id @default(uuid())
  quizId     String   // soft ref, NO cross-schema FK
  userId     String
  userName   String   // frozen at attempt time
  userEmail  String
  snapshotId String
  snapshot   AttemptSnapshot @relation(fields:[snapshotId], references:[id])
  status     AttemptStatus @default(IN_PROGRESS)
  startedAt  DateTime   // SERVER clock, authoritative
  expiresAt  DateTime   // startedAt + timeLimit + grace
  submittedAt DateTime?
  submitSource String?  // user | timer | sweeper | legacy
  clientIdemKey String?
  rawScore   Decimal? @db.Decimal(8,2)
  totalScore Decimal? @db.Decimal(6,2)   // was Int — every score truncated today
  maxScore   Decimal? @db.Decimal(8,2)
  correctCount Int?  wrongCount Int?  unansweredCount Int?
  negativeMarking Boolean
  negativeMarkValue Decimal @db.Decimal(4,2)
  timeSpentMs Int?
  scoringVersion Int @default(1)
  answers    AttemptAnswer[]
  @@unique([userId, clientIdemKey])
  @@index([userId, submittedAt(sort: Desc)])
  @@index([quizId, totalScore(sort: Desc)])
}

model AttemptSnapshot {
  id String @id @default(uuid())
  quizId String  quizVersion Int  contentHash String  // sha256 of canonical questions JSON
  timeLimitSec Int  negativeMarking Boolean  negativeMarkValue Decimal @db.Decimal(4,2)
  sections  Json   // real jsonb
  questions Json   // INCLUDES correctAnswer + explanation
  isReconstructed Boolean @default(false)  // true for backfilled legacy rows
  attempts Attempt[]
  @@unique([quizId, contentHash])
}

model AttemptAnswer {
  attemptId String  questionId String  section String
  selectedOption Int? @db.SmallInt
  markedForReview Boolean @default(false)  visited Boolean @default(false)
  timeSpentMs Int @default(0)  answeredAt DateTime?
  clientSeq BigInt @default(0)   // last-write-wins across tabs
  isCorrect Boolean?  awarded Decimal? @db.Decimal(4,2)   // written only at scoring
  attempt Attempt @relation(fields:[attemptId], references:[id], onDelete: Cascade)
  @@id([attemptId, questionId])
}

model Outbox {
  id BigInt @id @default(autoincrement())
  aggregateType String  aggregateId String  topic String  key String
  payload Json  headers Json  createdAt DateTime @default(now())  publishedAt DateTime?
}
```

Three indexes Prisma cannot express — raw SQL in the migration:

```sql
CREATE UNIQUE INDEX attempt_one_inflight ON assessment.attempt (user_id, quiz_id)
  WHERE status = 'IN_PROGRESS';                   -- one live attempt, enforced by the database
CREATE INDEX attempt_sweeper ON assessment.attempt (expires_at)
  WHERE status = 'IN_PROGRESS';                   -- stays tiny; excludes finished attempts
CREATE INDEX outbox_unpublished ON assessment.outbox (id) WHERE published_at IS NULL;
```

**API contract**

- `POST /v1/attempts` (+ `Idempotency-Key`) → 201 with `startedAt`, `expiresAt`, `serverTime`, `remainingMs`, and questions **without `correctAnswer`**
- `PATCH /v1/attempts/:id/answers` — autosave; `clientSeq` for last-write-wins across tabs; `?durable=1` forces a synchronous write-through
- `POST /v1/attempts/:id/submit` — server scores from the snapshot
- `GET /v1/attempts/:id/result` — reveals answers only once `status = SUBMITTED`

`correctAnswer` becomes **structurally unreachable**: `catalog-svc`'s public `GET /v1/quizzes/:id` returns metadata only — title, description, `timeLimit`, section *names*, `questionCount`, marking config. No question bodies at all, so keys cannot leak from that path even by accident. Keys exist only on the internal endpoint and inside the snapshot jsonb.

**Submit idempotency is a Postgres compare-and-swap, not Redis:**

```sql
UPDATE assessment.attempt SET status='SUBMITTED', submitted_at=now()
 WHERE id = $1 AND status = 'IN_PROGRESS';
```

Zero rows affected → replay the stored result. Redis-only idempotency for the operation that decides a student's score would be a correctness hole; the database must be the arbiter.

**Timer authority** moves to the server. `startedAt`/`expiresAt` are written to Postgres synchronously at start, and the client renders from `remainingMs` + `serverTime` drift correction. Today the timer is a client `setInterval` in `app/quiz/[id]/page.tsx:113-125` whose effect depends on `[quiz, timeLeft]` — so it is torn down and recreated every second, `handleSubmit` is captured stale, and auto-submit fires from inside a `setTimeLeft` updater (a side effect in a state reducer, which double-fires under StrictMode).

---

## Kafka topics

Naming: `quiz.<domain>.<event>.v<n>`. Local: Redpanda, 1 broker, 3 partitions, RF=1. Production: 6 partitions, RF=3, `min.insync.replicas=2`. Producers everywhere: `acks=all`, `enable.idempotence=true`, `compression.type=zstd`.

Shared envelope in `packages/contracts/src/events/envelope.ts`:

```jsonc
{ "eventId": "01J8ZQ...",       // ULID; the consumer dedupe key
  "eventType": "attempt.submitted",
  "eventVersion": 1,
  "occurredAt": "2026-07-26T11:03:22.412Z",
  "producer": "assessment-svc@1.4.0",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "data": { /* per-topic */ } }
```

Headers: `content-type`, `event-type`, `event-version`, `trace-id`, `idempotency-key`.

| Topic | Key | Retention | Consumers |
|---|---|---|---|
| `quiz.assessment.attempt-submitted.v1` | `userId` | 30d, **delete** | rollup, leaderboard, notification-fanout |
| `quiz.assessment.attempt-started.v1` | `userId` | 7d, delete | rollup (abandon count only) |
| `quiz.catalog.quiz-changed.v1` | `quizId` | **compact+delete**, `-1` | analytics `dim_quiz`, notification |
| `quiz.catalog.chapter-changed.v1` / `subject-changed.v1` | id | compact | analytics dims |
| `quiz.identity.user-changed.v1` | `userId` | compact | analytics `dim_user`, notification `user_ref` |
| `quiz.identity.user-erasure-requested.v1` | `userId` | 7d, delete | all (each redacts its own copies) |
| `quiz.notification.announcement-published.v1` | `announcementId` | 30d | notification-fanout |
| `quiz.notification.push-send-requested.v1` | `userId` | 3d, **12 partitions** | notification-sender |
| `quiz.ai.quiz-generation-requested.v1` / `-completed.v1` | `jobId` | 7d | ai-worker / SSE + notification |
| `quiz.analytics.export-requested.v1` / `-completed.v1` | `jobId` | 3d | export-worker |

**The key and retention choices are the substance here — each has a specific reason:**

- **`attempt-submitted` keyed by `userId`, not `quizId`.** Per-user causal ordering makes `user_stats.last_attempt_at`, streak computation, and the `last20_scores` ring buffer monotonic without extra guards. Keying by `quizId` would hot-spot — one popular mock test would put a large fraction of all traffic on a single partition, and users vastly outnumber quizzes. All rollup upserts for one user serialize onto one partition and therefore one consumer thread, eliminating write contention on the `user_stats` row. Cross-user ordering is not needed because every aggregate is additive.
- **`attempt-submitted` is not compacted.** It is a *fact* — "this happened at this time" — not entity state. Compaction keeps only the newest record per key, which would silently destroy every earlier attempt by that user and break the replay-to-rebuild story that is the entire reason Kafka is here. Older rebuilds come from `assessment.attempt`, because **Postgres is the system of record and Kafka is not.**
- **`quiz-changed` *is* compacted**, for precisely the inverse reason: entity state with upsert semantics, and no consumer ever needs an old version of a quiz. The payoff is concrete — **a brand-new `analytics-svc` with an empty database bootstraps its entire `dim_quiz` table by reading from offset 0**, with no bespoke sync endpoint and no code path that only runs during disaster recovery. This is the single strongest justification for Kafka over a queue in the whole design. Deletes emit a tombstone; the consumer belt-and-braces ordering with `WHERE dim_quiz.quiz_version <= excluded.quiz_version`.
- **No question bodies and no answer keys on the bus, ever.** `analytics` and `notification` both consume `quiz-changed` and neither is permitted to hold keys.
- **Push is two-stage.** A broadcast to 10,000 users must not be 10,000 records produced from an HTTP request thread. Stage one is a single `announcement-published` record; the fanout consumer then pages `push_subscription` in batches of 100 and produces stage-two `push-send-requested` records. This is where the nested unbounded `Promise.all` in `lib/push-notification-utils.ts:167-228` dies. Stage-two payloads carry `subscriptionId` — **never** `endpoint`/`p256dh`/`auth`, which are encryption secrets and a 3-day-retained log every consumer in the group can read is the wrong place for them. Retry: in-process exponential backoff, 3 attempts (1s/5s/25s), then DLQ. HTTP 410 Gone → mark the subscription inactive and do **not** DLQ; the endpoint being dead is a success.
- **`ai-generation-requested` keyed by `jobId`, not `createdBy`.** There is no ordering requirement between generation jobs, so `jobId` spreads work evenly; keying by `createdBy` looks natural but would serialize one admin's five jobs onto one partition. Set `max.poll.interval.ms=600000` (or pause the partition, process, resume, commit), because the 300s default while a 400s Gemini job runs evicts the consumer from the group, triggers a rebalance, and **generates the quiz twice.**
- **No `attempt-expired` topic.** The sweeper auto-submits and emits `attempt-submitted` with `submitSource='sweeper'`. One state transition, one topic, one discriminator field. Two topics for the same transition means two handlers that must stay in sync forever.
- **Payload cap.** A 200-question attempt's `questionOutcomes` array is ~40KB under zstd, which is fine. Above 300 questions, emit `outcomesRef: "/internal/attempts/<id>/outcomes"` and null the inline array (claim-check pattern), so one pathological quiz cannot exceed `max.message.bytes`.
- **DLQ per consumer group:** `<topic>.dlq.v1`, original key preserved, headers `x-original-topic/partition/offset`, `x-error-class`, `x-attempts`, 30d retention. `POST /v1/admin/dlq/replay` re-publishes.

**Delivery semantics.** Transactional outbox only where a DB write and an event must be atomic (`attempt-submitted`, `quiz-changed`, `announcement-published`); publish inline elsewhere — an outbox for `export-requested` is pointless because no state is committed, so there is nothing to be consistent with. Consumer-side idempotency via a `processed_event(event_id, consumer_group, processed_at)` row written in the same transaction as the upsert.

---

## Redis

One instance (`redis:7-alpine` locally, Upstash in production). Logical separation by **key prefix, not DB index** — Upstash and Redis Cluster do not support `SELECT`. Everything is prefixed `q:`, and all key construction goes through typed builders in `packages/redis-kit/src/keys.ts` so there is exactly one place a pattern is defined.

| Purpose | Key | Type | TTL |
|---|---|---|---|
| Refresh session | `q:sess:<sid>` | HASH `{userId, ua, ipHash, refreshHash}` | 30d sliding |
| Log out everywhere | `q:sess:user:<userId>` | SET of sid | 30d |
| Access-token revocation | `q:denylist:jti:<jti>` | STRING | remaining exp (≤15m) |
| In-flight attempt | `q:att:<attemptId>` | HASH | timeLimit + 15m |
| In-flight answers | `q:att:<id>:ans` | HASH, field = questionId | same |
| Resume lookup | `q:att:user:<userId>:<quizId>` | STRING → attemptId | same |
| Scoring input (has keys) | `q:att:snap:<snapshotId>` | STRING json | 1h |
| Write-behind queue | `q:att:dirty` | ZSET, score = now_ms | — |
| Leaderboards | `q:lb:quiz:<id>` / `subject:<id>` / `global` / `weekly:<isoWeek>` | ZSET | weekly 9d, rest none |
| Display names | `q:lb:names` | HASH userId→name | none |
| Analytics cache | `q:cache:analytics:overview` etc. | STRING | 300s (SWR at 60s) |
| Rate limiting | `q:rl:<policy>:<subject>:<windowStart>` | STRING | 2× window |
| Idempotency | `q:idem:<route>:<userId>:<key>` | STRING | 24h |
| SSE | `q:pubsub:user:<id>`, `q:sse:ticket:<t>` (30s, `GETDEL`) | pub/sub, STRING | — |

### Auth

RS256 access JWT, 15-minute TTL. Only `identity-svc` holds the private key; every other service fetches `/.well-known/jwks.json` and caches it 10 minutes in process. **RS256 over HS256 specifically because with five verifiers a shared symmetric secret means five services that can *mint* tokens** — with RS256, four of them hold nothing secret at all. Claims: `sub, email, name, role, sid, jti, iat, exp, iss, aud`. Refresh rotation on `POST /v1/auth/refresh`, with reuse detection: presenting a rotated refresh token kills the entire session family.

**This is the largest latency win in the project.** Today there are nine duplicated `validateToken` copies (`app/api/results/route.ts:8-51`, `app/api/analytics/route.ts:8-45`, `app/api/announcements/route.ts:8-36`, and six more) and each performs a `prisma.user.findUnique` **on every single request**. They collapse into one local signature verification plus one Redis `GET`.

Not in Redis: the password hash, the user row. Postgres remains the source of truth for identity.

### In-flight attempt state

A HASH per attempt rather than one JSON blob, deliberately: `HSET` on one question is O(1), and two tabs answering different questions cannot clobber each other's fields — a read-modify-write of a blob would.

**Write-behind flusher** in `assessment-worker`, every 5s: `ZRANGEBYSCORE q:att:dirty 0 <now-3000> LIMIT 500` → `HGETALL` each → one batched `INSERT ... ON CONFLICT (attempt_id, question_id) DO UPDATE WHERE excluded.client_seq > attempt_answer.client_seq` → `ZREM`. During a 100-student exam Postgres sees roughly 20 writes/s instead of ~3,000.

**Durability, stated honestly.** Redis is a cache, so autosave must survive a flush. Three mitigations: (a) the `attempt` row with `startedAt`/`expiresAt` is written to Postgres **synchronously at start**, so the timer is never Redis-only; (b) the flusher bounds exposure to ≤5s; (c) client autosave sets `?durable=1` every 60s for a synchronous write-through. Residual risk: up to 5 seconds of answer changes lost on total Redis loss. That is an accepted trade — the alternative is a synchronous Postgres write per click, which is the thing being engineered away. A circuit breaker degrades the answer path to direct Postgres writes when Redis is unreachable: slower, still correct.

### Leaderboards

Greenfield — nothing exists today except marketing copy in `components/landing/FeaturesSection.tsx:96`. Sorted sets, member = `userId`, with a composite integer score so ties break by speed:

```
score = round(totalScore × 100) × 1e6 + (999_999 − min(timeSpentSec, 999_999))
```

Max ≈ 1.0e13, comfortably inside float64's exact-integer range (2^53 ≈ 9.0e15), so no precision loss. Decode: `pct = floor(s / 1e6) / 100`, `secs = 999_999 − (s mod 1e6)`.

`ZADD q:lb:quiz:<id> GT <score> <userId>` — the `GT` flag (Redis ≥6.2) means a worse retry can never lower an existing entry. **That single flag is the entire "best attempt counts" rule**: no read-then-write, no race.

**Weekly rotation is implicit in the key.** `q:lb:weekly:2026-W31` expires on its own, and last week's board stays readable at `...W30` until its TTL fires — so there is no cron job, no `RENAME`, and no window where the leaderboard is empty or doubled. Date-bucketed keys beat a reset job every time.

Rebuild via `POST /v1/admin/leaderboards/rebuild`, replaying `analytics.attempt_fact` with pipelined `ZADD GT`. That rebuild path is *why* leaderboards-in-Redis is correct rather than reckless: a Redis wipe is a ten-second inconvenience, not data loss.

Worth noting: rank is computed from server-scored attempts. On the current architecture a leaderboard would be trivially forgeable, since `app/api/results/route.ts:82` accepts whatever `totalScore` the client posts.

### Analytics cache

`q:cache:analytics:overview` served **stale-while-revalidate** with a 60s freshness target: if `age > 60s`, return the stale payload immediately and kick a background refresh guarded by single-flight `SET q:lock:analytics:overview <token> NX EX 30`. That prevents a thundering herd when three admins open the dashboard at once.

**Invalidation is TTL-first, event-nudged.** The rollup consumer, *after* its Postgres transaction commits, `DEL`s the narrow keys it knows it invalidated and leaves the wide dashboard key to its TTL — precise invalidation of a wide aggregate is where cache bugs breed, and a 60-second-stale admin dashboard costs nothing. To invalidate a key *family* without `KEYS`/`SCAN`, members are tracked in `q:cache:idx:quiz:<id>` (a SET) and invalidated with `SMEMBERS` + pipelined `DEL`. `KEYS *` never runs in production.

### Rate limiting

**Decision: approximate sliding window via two weighted fixed-window counters, in one Lua script.**

Rejected, with reasons: a sliding-window *log* (ZSET of request timestamps) is exact but costs O(requests) memory per client and a `ZREMRANGEBYSCORE` on every call — wasteful for a chatty autosave endpoint. Token bucket / GCRA is elegant and smooths bursts, but its continuous state makes "why did I get a 429" genuinely hard to debug alone at 1am. Two fixed windows with linear interpolation is two `INCR`s, O(1) memory, ≤~5% boundary error, explainable in one sentence, and is what Cloudflare ships.

| Policy | Limit | Why |
|---|---|---|
| `login:ip` | 10 / 5 min | brute force |
| `login:email` | 5 / 15 min | credential stuffing — per-IP alone does not catch a botnet hitting one account |
| `signup:ip` | 3 / hour | spam accounts |
| `ai-gen:user` | 5 / hour | Gemini costs real money |
| `export:user` | 3 / hour | each export is a full table scan |
| `answers:attempt` | 120 / min | autosave is chatty *by design*; this is an abuse ceiling, not a throttle |
| `default:user` / `default:ip` | 300 / 600 per min | |

Enforced at the gateway; `ai-gen` and `export` are re-checked inside their services, because anything that bypasses the gateway would otherwise bypass the limit.

### Locks — two, both best-effort, neither load-bearing

Submit uses a conditional `UPDATE`. The outbox publisher uses `FOR UPDATE SKIP LOCKED`. The expiry sweeper's `SET q:lock:sweeper:<shard> NX EX 25` is a "don't bother running twice" optimization, not a mutex protecting correctness — `SKIP LOCKED` inside the query already guarantees that, and a missed tick is recovered 30 seconds later. Cache stampede single-flight is likewise best-effort.

This is why Redlock is not in the design: its contested failure modes only matter when a lock protects correctness, and here none does. The general rule worth stating: **if you find yourself needing a correctness-critical distributed lock, your transaction boundary is in the wrong place.**

### What must NOT go in Redis

- Anything whose only copy it would be: submitted attempts, scores, post-submit answers, users, quizzes, question bank, announcements.
- Answer keys as the only copy — `q:att:snap:*` is a *cache of* a Postgres `jsonb` column and must be reconstructible from it.
- `QuestionBankItem.image` base64 blobs. Those should not be in Postgres either — they belong in object storage, and they are almost certainly dominating row sizes and Neon egress today.
- Unbounded per-user analytics history. Upstash bills per command and per GB; a growing key with no TTL is a growing bill.
- Kafka's job. There is **no Redis list queue anywhere** in this design, deliberately — two buses means two sets of retry semantics, two dead-letter stories, and an ordering question nobody can answer.
- Accepted consequence of refresh sessions in Redis: a total Redis loss logs everyone out. That is fine for a quiz app. If it ever isn't, the upgrade is a durable `identity.session` table with Redis as a read-through cache. Noted, not built.

---

## Analytics read model

`analytics` schema, written only by its consumers:

```sql
dim_user, dim_quiz, dim_chapter, dim_subject          -- from compacted topics

attempt_fact(attempt_id pk, user_id, quiz_id, chapter_id, subject_id, submitted_at,
  submitted_date date GENERATED, total_score numeric(6,2), raw_score, max_score,
  correct_count, wrong_count, unanswered_count, time_spent_ms, submit_source, scoring_version)
  -- idx: (user_id, submitted_at DESC), (quiz_id, submitted_at DESC),
  --      (submitted_date), (quiz_id, total_score DESC)

attempt_section_fact(attempt_id, section) pk     -- per-section drilldown
question_stat(quiz_id, question_id) pk           -- attempts/correct/wrong/sum_time_ms +
  -- option_counts jsonb for distractor analysis. p_value = correct/attempts.
  -- Per-question difficulty analysis is IMPOSSIBLE with the current schema.
user_stats(user_id pk)                           -- attempts, sum_score, best, avg,
  -- last20_scores numeric[], last20_avg, current/longest_streak_days
quiz_stats(quiz_id pk)                           -- attempts, unique_users, abandon_count, avg_*
daily_rollup(bucket_date, quiz_id, subject_id) pk  -- every "last 30 days" chart becomes ~30 rows
user_daily_activity(user_id, activity_date) pk     -- powers components/activity-calendar.tsx
quiz_user_seen(quiz_id, user_id) pk                -- exact unique_users, O(1) per event
processed_event, export_job, backfill_state
```

`unique_users` is exact via `quiz_user_seen` (`INSERT ... ON CONFLICT DO NOTHING`, incrementing `quiz_stats.unique_users` only when `rowCount = 1`). **HyperLogLog rejected** — approximate distinct counts on an admin dashboard with 10,000 users solves a problem that does not exist, and "why is the number slightly wrong" is a support ticket you answer forever.

`GET /v1/analytics/overview` becomes reads of `daily_rollup` + `quiz_stats` behind the SWR cache — replacing a full `QuizResult` scan plus an O(results × quizzes) JS join.

---

## Realtime — replacing the 5-minute poll

`components/layout/top-header.tsx:190` calls `setInterval(fetchAnnouncements, 5 * 60 * 1000)`. That component lives in the app shell, so it is mounted on every authenticated page, and each call performs a `user.findUnique` for auth *plus* a `findMany` with a correlated `readBy` include. At N concurrent users that is a permanent floor of traffic regardless of activity.

**SSE, not WebSocket.** Traffic is server→client only (announcements, AI job progress, leaderboard nudges); there is no client→server channel to justify a bidirectional protocol, and SSE gets automatic browser reconnection with `Last-Event-ID` replay for free over plain HTTP/2.

Hosted by `notification-svc` at `GET /v1/stream`. Auth uses a single-use ticket (`POST /v1/stream/tickets` → `q:sse:ticket:<t>`, 30s TTL, consumed with `GETDEL`) because `EventSource` cannot send an `Authorization` header. Fan-out across instances via Redis pub/sub (`q:pubsub:user:<userId>`, `q:pubsub:broadcast`), with a capped ZSET backlog per user for reconnect gap-filling.

---

## Repo layout

pnpm workspaces + Turborepo.

```
quiz-repo/
├─ apps/
│  ├─ web/                    ← existing app/, components/, hooks/, public/ move here
│  ├─ gateway/
│  ├─ identity/  catalog/  assessment/  analytics/  notification/
│  │   └─ each: src/{routes,domain,infra}/ · prisma/schema.prisma · Dockerfile
├─ packages/
│  ├─ contracts/              ← zod schemas + TS types for every HTTP DTO and Kafka event
│  ├─ auth-kit/               ← JWT verify, JWKS cache, role guards (replaces 9 copies)
│  ├─ redis-kit/              ← client + typed key builders + Lua scripts
│  ├─ kafka-kit/              ← producer/consumer wrappers, envelope, outbox publisher, DLQ
│  ├─ observability/          ← pino, OTel init, request-id propagation
│  └─ config-eslint/ config-ts/
├─ infra/
│  ├─ docker-compose.yml  docker-compose.obs.yml
│  ├─ postgres/init/01-schemas-roles.sql
│  └─ grafana/ prometheus/
└─ turbo.json
```

Turborepo over Nx: `turbo.json` is ~30 lines versus Nx's generator/executor model, and remote caching in CI is one environment variable. Solo developer — pick the tool you can debug.

Moving `apps/web`: the `@/*` alias keeps pointing at the `apps/web` root, so **imports do not change**. Two required fixes: (1) **remove `lib/generated/prisma` from git** — a 16,000-line generated `index.d.ts` is currently checked in; each service generates its own client into `node_modules/.prisma` at build time; (2) add `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` so Windows query-engine binaries don't break Alpine containers (there are already orphaned `query_engine-windows.dll.node.tmp*` files in the tree).

**Gateway: Fastify.** Rejected: Nginx/Traefik (cannot do the Redis denylist check without Lua or a custom plugin), Kong (a Postgres + admin-API dependency to route five services). Auth is terminated **once** at the gateway, which strips any inbound `x-user-*` header and forwards a short-lived internal signed header — services still verify it, but they don't each re-parse the public JWT. Server Components fetch services **directly over the Docker network**, bypassing the gateway hop; only browser traffic goes through it.

**Services: Fastify + Prisma, not NestJS.** The existing route handlers are plain functions with Prisma calls, so Fastify is a near-mechanical port; NestJS means rewriting all 47 into modules, providers, and DTO decorators before a single behavioural improvement lands. Fastify also gets schema-based validation from the `packages/contracts` zod schemas for free.

---

## Local infrastructure (Docker Compose)

Containers: `postgres:16-alpine` (with `infra/postgres/init/01-schemas-roles.sql`) · `redis:7-alpine` · `redpanda` + `redpanda-console` (Kafka API in one container, ~10× lighter than Kafka + KRaft) · `minio` · gateway + 5 services + 5 workers · `jaeger` · `prometheus` + `grafana` in an optional `docker-compose.obs.yml` so the default `up` stays fast. Every service gets a `healthcheck` and `depends_on: {condition: service_healthy}`.

Windows/Docker Desktop notes: use the WSL2 backend and cap `vmmem` in `%UserProfile%\.wslconfig` (`memory=8GB`, `processors=4`) before the first `compose up`. Bind-mount only source, never `node_modules`. Add `.gitattributes` with `* text=auto eol=lf` so entrypoint scripts don't break on CRLF. If a local PostgreSQL or Redis/Memurai is already installed as a Windows service, publish **5433** and **6380** to avoid the port collision, and document it in `.env.example`.

**Observability:** pino structured logs · OpenTelemetry → Jaeger · Prometheus + Grafana · `/healthz` + `/readyz` per service. The trace worth building for: **one `traceId` following `POST /v1/attempts/:id/submit` through the outbox publisher, across the Kafka record header, into the rollup consumer's Postgres upsert.** That single view is worth more than the component list.

---

## Phases

Every phase ends with a working, deployable app. Each ships behind a flag defaulted **off**; enabling is a separate, one-click-revertable commit.

### Phase 0 — Security & credential rotation (1–2 days)

1. Rotate the Neon database password and the JWT/session secrets. **The credential is in git history — deleting the file is not a fix.**
2. `git rm --cached .env.production`; change `.gitignore:29-30` to `.env*` with a `!.env.example` negation; add a real `.env.example` (README line 60 currently references a `.env.local.example` that does not exist).
3. Delete all 7 `app/api/debug/*` routes — `debug/env` returns 50 characters of `DATABASE_URL`, and `debug/database-operations` is 245 unauthenticated lines that run caller-selected database operations from a request body. Delete the 5 debug pages (`app/test-api`, `test-analytics`, `debug-analytics`, `diagnose`, `clear-cache`) and the 3 zero-byte route files.
4. Add authorization to `app/api/admin/quizzes/export-csv/route.ts` (currently an unauthenticated dump of every user's name, email and score) and `app/api/user/progress/route.ts` (an unauthenticated roster of every user with `lastLogin`). The full fix lands in Phase 2; they must not be open in the meantime.
5. Ship a **self-unregistering service worker** replacing `public/sw.js`. Its cache-first GET handling invalidates every rollback story in this plan — do this first so later rollbacks actually reach users. (The existence of `app/clear-cache/page.tsx` is evidence this already causes stale-content problems.)
6. Reconcile any project documentation with what the code actually does.

> **If you are reading this document in the public repository and Phase 0 is not yet complete, treat every finding above as live.** The items are listed in the order they should be closed.

### Phase 1 — Safety net (3–4 days) · prerequisite for everything after

1. Flip both flags in `next.config.mjs`. `tsconfig.json` already sets `strict: true`, so removing `ignoreBuildErrors` and `ignoreDuringBuilds` *is* the whole win. If the error count is large, gate it behind a **ratchet** — a committed baseline that CI forbids increasing — rather than blocking for a week.
2. Extract the client scoring logic from `app/quiz/[id]/page.tsx:236-283` into `lib/scoring.ts` verbatim, then snapshot **golden fixtures** from its current output (~40 table-driven cases). Server scoring in Phase 4 must reproduce these exactly, including negative marking.
3. Vitest on: scoring, `lib/database-utils.ts` JSON round-trips, `lib/math-symbol-processor.ts`.
4. Two Playwright specs, non-negotiable: **login → take quiz → submit → see score**, and **admin edits a quiz → student sees the edit**.
5. GitHub Actions: `typecheck`, `lint`, `vitest`, and Playwright against a Postgres service container.

### Phase 2 — Auth done right (3–4 days)

argon2id (not bcrypt — memory-hard, and there is no legacy hash format to preserve). One `packages/auth-kit` replacing all nine `validateToken` copies. RS256 access JWT (15 min) + refresh rotation in Redis. httpOnly cookies; `hooks/use-auth.tsx` keeps only a display-only, non-authoritative session hint. Add `middleware.ts` (there is none today). Delete every `token.length < 10` check and every `*-token-placeholder` fallback from the ~15 client files that carry one.

**Password migration, zero lockout:** add `passwordHash` + `passwordAlgo`; on a successful plaintext login, hash and store, then null the plaintext; keep the old column populated for two weeks for rollback; force-reset the residue. **Token migration:** dual-accept legacy tokens for 30 days behind an `X-Auth-Legacy` response header you monitor, then drop.

### Phase 3 — Quick wins on the live database (half a day)

`@@index([userId, date])` and `@@index([quizId])` on `QuizResult` — the cheapest latency win in the repo, applied via `CREATE INDEX CONCURRENTLY` in a raw SQL migration. Remove `await prisma.$disconnect()` from `app/api/auth/login/route.ts:104` — it tears down the shared singleton's pool for every concurrent request (the same bug exists in `app/api/subjects/route.ts:53`, `subjects/[id]/route.ts:28`, `subjects/[id]/chapters/route.ts:43`). Remove the pointless `setTimeout(100)` in `app/api/admin/results/route.ts:51`. Add `connection_limit`/`pool_timeout` to the Neon pooler URL.

### Phase 4 — Server-side scoring + `Attempt` (5–7 days) · the correctness phase

Still inside the monolith. New tables, new `/v1/attempts` routes alongside the existing `/api/results`, dual-running with score comparison logged. Rewrite `app/quiz/[id]/page.tsx` against the new contract.

Kill the client scoring and the `localStorage["quizResults"]` write at `app/quiz/[id]/page.tsx:299-301` — **note the hidden dependency: `app/goals/page.tsx:72` reads its data from that localStorage array, not from the API.**

Backfill legacy `QuizResult` rows into `Attempt` with `isReconstructed: true` snapshots rebuilt from the `answers` blobs (which currently embed full question text, options and explanations) and `submitSource='legacy'`. Also fix the falsy-zero bug in `handleSaveAndNext` around `app/quiz/[id]/page.tsx:203`.

### Phase 5 — Aggregate queries + pagination (3–4 days)

Rewrite the four full-table-scan routes with `groupBy`/`aggregate` and keyset pagination: `/api/admin/quizzes` (drop `include:{results:true}` — it only needs three numbers), `/api/admin/analytics`, `/api/admin/users`, `/api/user/progress`. Collapse `/api/results`, `/results/history` and `/results/recent` into one cursor-paginated endpoint (they differ only by `take`). Stop returning full result sets to the browser.

Pick **one** of `components/advanced-analytics.tsx`, `simple-advanced-analytics.tsx`, `student-analytics.tsx` — they are three abandoned rewrites of the same view, alongside two zero-byte `components/analytics/*-v2.tsx` files. Decide before moving them into `apps/web`, or the work is done twice.

### Phase 6 — Make things cacheable (2 days) · **must precede Redis**

Remove all ~10 `?t=${Date.now()}` cache-busters (`app/admin/page.tsx:282,306,667,1750,1813`; `admin/analytics/page.tsx:109,488`; `analytics/page.tsx:20,27`). Audit the 29 `dynamic='force-dynamic'` exports and the blanket `no-store` headers, replacing them with ETags and `Cache-Control: private, max-age=60` where correct. Doing Redis before this means adding a cache layer that is bypassed by construction.

> ### ◆ Stop-here marker
> After Phase 6 the app is fast, secure, correctly scored, properly indexed, and cacheable, with tests and CI — **every real defect fixed.** If time runs out, stopping here is a large and defensible win. Everything after this is architecture demonstration rather than defect repair.

### Phase 7 — Monorepo + Compose + observability (4–5 days)

Turborepo, `apps/web`, `packages/*`, Docker Compose with Postgres/Redis/Redpanda/MinIO/Jaeger, pino + OTel, health and readiness endpoints. No service extracted yet — this is scaffolding, and it is what makes every later phase fast.

Housekeeping in the same pass: reconcile the dual lockfiles (both `package-lock.json` and `pnpm-lock.yaml` exist — keep pnpm), pin the 8 dependencies currently set to `latest` (`jsonwebtoken`, `next-themes`, `recharts`, and 5 Radix packages — non-reproducible installs), fix `eslint-config-next@15.3.4` against `next@14.2.35`, fix `react-is@^19` against React 18, and remove the 4 broken `db:*` scripts pointing at files that do not exist (`export-production-data.js`, `setup-local-database.js`, `switch-database.js`).

**Delete outright:** `backend/` (contains only a stale `tsconfig.tsbuildinfo`) · `lib/data-store.ts` (dead in-memory store whose types now conflict with Prisma's) · `prisma/schema.production.prisma` (drifted duplicate) · `app/analytics/page.tsx.backup` · `fix-dark-shadows.js` · `dev.log` · root `tsconfig.tsbuildinfo` (1MB) · `reference codes for design/` · `lib/generated/prisma` · `app/api/admin/stats/route.ts` (returns hardcoded mock arrays) · `app/api/admin/quizzes/[id]/questions/route.ts` (entirely stubbed — `GET` returns `{questions:[]}`, `POST` fabricates a response and never touches the database).

### Phase 8 — Schema normalization (5–6 days, timeboxed)

`Quiz.sections`/`questions`, `QuizResult.sections`/`answers`, and `QuestionBankItem.options`/`tags` are all `String` columns holding JSON — `lib/database-utils.ts` exists solely to paper over this. Normalize to `Question` + `QuizQuestion`; move base64 `QuestionBankItem.image` values to object storage.

Add `Quiz.version` + optimistic concurrency (409 on a stale write). This fixes silent data loss: two admins using the whole-blob write path in `app/admin/quiz/[id]/page.tsx:152-215` currently clobber each other, last-write-wins. Make bulk import append-only.

**Timeboxed to 6 days.** If the verify script isn't clean by day 6, ship the cheap subset — convert to real `Json` columns, move images to blob storage, apply the `Quiz.version` fix — and leave `Quiz.questions` as a blob. That subset alone kills last-write-wins and shrinks rows by an order of magnitude.

Migration pattern for each: dual-write → backfill with a resumable cursor → **verify script that hard-fails on any orphan** → read-switch behind a flag → drop the old column one release later. Dress-rehearse every migration on a database branch of production data and run the Playwright suite against that branch.

### Phase 9 — Kafka + workers, still in the monolith (5–6 days)

Redpanda + `packages/kafka-kit` + the outbox table and publisher. Move the three inline slow paths to workers, in this order:

1. **Push fan-out** — the clearest single-line extraction (`app/api/announcements/route.ts:143`).
2. **AI quiz generation** → `202 Accepted` + jobId. Write each section into `ai_generation_job.partial_questions jsonb` as it completes, so a failure resumes instead of discarding everything; `status='partial'` still creates the quiz as an `isActive=false` reviewable draft. Nothing generated is ever thrown away.
3. **CSV export** → `COPY (SELECT ...) TO STDOUT WITH CSV HEADER` streamed to a MinIO multipart upload plus a 24-hour presigned URL. Constant memory at any row count, replacing an in-memory `json2csv` build over the whole table.

Then the `analytics` schema, the rollup consumer, and the backfill — in this order: **backfill from existing rows → run the verify script → switch reads → only then start streaming.** Reading a rollup table that hasn't been backfilled shows zeros on the dashboard, which is a bug you will chase for hours. Finally Redis leaderboards and SSE replacing the 5-minute poll.

### Phase 10 — Extract the services (7–10 days)

Strangler-fig, one service at a time, in dependency order: `identity` → `catalog` → `notification` → `analytics` → `assessment`.

Mechanism: keep each Next.js route file as a thin proxy that forwards to the new service when `SERVICE_<NAME>_ENABLED` is set and falls through to the existing handler otherwise. Flip per-route, verify, then delete the old handler in a follow-up commit. Postgres schemas and roles go in first; then each service gets its own Prisma client and migration history. Decide the gateway topology **before** starting, not during.

---

## Timeline & scope control

| Budget | Do |
|---|---|
| **One weekend** | Phase 0 only. |
| **2 weeks** | Phases 0–3 plus Phase 6. Secure, indexed, tested, cacheable. |
| **~6 weeks** | Phases 0–6 — the stop-here marker. Every real defect fixed. |
| **~3 months** | All 10 phases. |

**What to cut first, in order:** `attempt-started.v1` (feeds one metric, abandonment) · `identity-svc` as a separate deployable (weak on scaling grounds; keep it only for the blast-radius argument) · full normalization in Phase 8 (ship the `Json`-column subset) · the separate gateway container (its job could be a shared middleware package imported by each service).

---

## Where this design is wrong, and why it's here anyway

The most useful section. Ordered by how likely it is to be challenged.

**Why Kafka and not BullMQ?** At single-digit concurrent users, BullMQ or `pg-boss` would do everything in this document. Three things earn Kafka's place:

1. **Multiple independent consumers of one fact, with independent failure.** `attempt-submitted` is consumed by analytics rollups, leaderboards, and notifications — three different failure modes. In BullMQ you either enqueue three jobs at produce time, which means the producer must know every consumer (the exact coupling being removed, and it grows each time a consumer is added), or you use one job that does all three, in which case a web-push timeout rolls back your rollup. Kafka's per-group offsets give three consumers that fail and catch up independently.
2. **Replay as a rebuild primitive.** `question_stat` and every leaderboard are derived state. Resetting a consumer group to offset 0 is what makes it *safe to change the aggregation logic* — which you will, the first time you want a difficulty metric you didn't think of. A queue deletes jobs on completion, so there is nothing to replay and every logic change becomes a bespoke migration script.
3. **Compacted topics as a state-transfer mechanism.** `dim_user`/`dim_quiz` bootstrap from offset 0 with no special-case code. There is no queue equivalent. (Fair counter-attack: this design still keeps backfill endpoints. Conceded.)

**Where Kafka is the wrong tool inside this very design.** Two topics, named before anyone asks:

- **`ai-generation-requested`** — a 30–120s single-consumer task needing per-job status, progress reporting, delayed retries, and a concurrency knob. That is BullMQ's exact job description. Kafka actively fights it: `max.poll.interval.ms` tuning, rebalance storms while a long job is in flight, no per-job status (so `catalog.ai_generation_job` lives in Postgres anyway — a tell), no built-in delayed retry, and one slow record head-of-line-blocks its partition. **Verdict: cargo cult.**
- **`export-requested`** — same shape, same verdict. `analytics.export_job` already exists in Postgres doing the work Kafka won't.

**What a staff engineer would actually ship:** Kafka for **facts** (`attempt-submitted`, `*-changed`, `announcement-published`) and `pg-boss` for **commands** (ai-generation, export, push-send) — Postgres-backed, zero new infrastructure, and it participates in existing transactions. This design keeps Kafka for both, for demonstration value. Knowing where the line is, is the skill.

**Also rejected, with reasons:**

- **Debezium/CDC** — a Connect cluster plus connector configs plus schema coupling, to avoid ~150 lines of outbox poller. Right at 50 services, wrong at one developer.
- **Kafka transactions / exactly-once semantics** — the side effects here are Postgres and web-push, neither of which participates in a Kafka transaction, so EOS buys latency and an illusion. Idempotent consumers plus a dedupe table is simpler *and* actually correct.
- **Redlock** — no lock in this design protects correctness.
- **Redis for the announcement list** — ~20 rows that change daily; Postgres serves it in 1ms from an index. An ETag plus `Cache-Control: private, max-age=60` is the correct cache. A Redis key here would be caching for the aesthetic.
- **HyperLogLog** — approximation without a scale problem is decoration.
- **Redis keyspace expiry notifications for attempt timeout** — best-effort delivery, lost on failover. A partial index plus a 30s sweeper is strictly more reliable and easier to test.
- **Retry topics / delay-topic ladders for push** — three extra topics and a scheduler so a notification can arrive four minutes late.
- **The API gateway as a separate service** — genuinely borderline. Its whole job (verify JWT, check denylist, rate limit, route, CORS) could be a shared middleware package imported by each service, saving a network hop and a container. The defence is that it is the single public surface and the single place the denylist is checked, so the auth security review is one file. That is a real but modest benefit at this scale, and it should not be oversold as load-bearing.

**And the headline.** A well-factored **modular monolith** — one Next.js app, `pg-boss`, Redis, the same domain modules, the same five schemas, the same `Attempt` model, the same rollup tables — would fix **100% of the actual defects in this codebase**: the committed credential, the plaintext passwords, the forgeable tokens, the bypassable admin routes, the client-side scoring, the missing indexes, the full-table scans, the unbounded `Promise.all`, the OOM-prone export. At roughly 20% of the effort. For a solo developer with real users, that is the correct engineering call.

The reason to do the split anyway is that service boundaries, event-carried state transfer, compacted-topic bootstrapping, and read-model design are genuinely hard to *demonstrate* inside a monolith, and demonstrating them is an explicit goal of this project. Both of those statements are true at once, and the plan is stronger for saying so.

---

## Risk register

| Risk | Trigger | Mitigation |
|---|---|---|
| Rollbacks never reach users | cache-first `public/sw.js` | Self-unregistering SW ships in P0, before anything else |
| Score drift nobody notices | no score assertions today | Golden fixtures snapshotted from current client logic (P1) |
| Users locked out | password migration | Keep the old column populated 2 weeks (P2) |
| Everyone logged out on deploy | token format change | Dual-accept legacy tokens 30 days, watch `X-Auth-Legacy` (P2) |
| Redis/CDN does nothing | `?t=` busters + 29 `no-store` routes survive | P6 strictly precedes Redis (P9) |
| Analytics dashboard reads zeros | streaming into un-backfilled rollups | backfill → verify → read-switch → *then* stream (P9) |
| Historical results unreadable | legacy-id mapping missed in backfill | verify script hard-fails on any orphan reference (P4, P8) |
| Silent data loss on concurrent admin edits | whole-blob rewrite | `Quiz.version` + 409 + append-only bulk import (P8) |
| Migration applied to prod untested | no production-data test target | DB branch dress rehearsal + a PITR restore point per migration |
| AI job runs twice | `max.poll.interval.ms` 300s default vs 400s job | Set 600000 + pause/resume; partitions ≥ 2× workers (P9) |
| Stalls at ~60% with a broken app | momentum-driven scope | Stop-here marker at P6; every phase independently deployable |

---

## Definition of done — the same checklist every phase

1. `pnpm typecheck && pnpm lint && pnpm vitest run` green.
2. Both Playwright specs green against Docker Postgres.
3. Contract tests green, with inverted assertions updated **in the same PR** as the contract change, never in a follow-up.
4. Migration dress-rehearsed on a database branch; E2E run against that branch.
5. Manual smoke: login → take quiz → see score → reload result → admin edit → student sees the edit.
6. PR description contains the flag name, the revert command, and the restore point.
7. **Flags default off on merge; flipped on in a separate commit.** Merging code and enabling behaviour are always two deploys — that is what turns "did I break production" from a question into a one-line answer.

---

## Verification

**Phase 0** — `git ls-files | grep env` returns nothing. Each deleted debug route returns 404. The old database password fails to connect. A request with a placeholder bearer token against an admin route returns 401.

**Phase 1** — CI goes red on an intentionally broken type. All 40 scoring fixtures pass. Both Playwright specs pass.

**Phase 3** — `EXPLAIN ANALYZE SELECT * FROM "QuizResult" WHERE "userId"=$1 ORDER BY date DESC LIMIT 20` shows an index scan, not a sequential scan.

**Phase 4** — Dual-run comparison logs zero score mismatches across a week. `GET /v1/quizzes/:id` contains `correctAnswer` nowhere in the response. Submitting the same `Idempotency-Key` twice yields an identical result and one row. Killing the browser mid-attempt and reopening restores answers and remaining time from the server.

**Phase 5** — Prisma query logs show `groupBy` and zero unbounded `findMany` on the admin dashboard. The `/v1/analytics/overview` payload drops by more than 90%.

**Phase 7** — `docker compose up` from clean brings every healthcheck green. Jaeger shows one trace spanning gateway → service → Postgres.

**Phase 9** — Publishing an announcement to 1,000 seeded subscriptions returns in under 200ms with pushes draining via the worker. Killing the rollup consumer mid-stream and restarting it double-counts nothing (`processed_event`) and resumes from committed offsets. Resetting the consumer group to offset 0 rebuilds rollups to identical numbers. The DLQ is empty in Redpanda Console. `ZREVRANGE q:lb:quiz:<id> 0 9 WITHSCORES` matches `ORDER BY total_score DESC LIMIT 10` from `attempt_fact`.

**Phase 10** — Stopping `analytics-svc` leaves student quiz-taking working end to end (correct blast-radius isolation). `psql -U assessment_rw -c 'SELECT * FROM catalog.quiz'` returns permission denied.
