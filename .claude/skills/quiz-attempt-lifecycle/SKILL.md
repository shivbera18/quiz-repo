---
name: quiz-attempt-lifecycle
description: Master skill for starting, resuming, autosaving, expiring, submitting, scoring, and displaying quiz attempts in assessment-svc. Trigger whenever working on quiz attempts, attempt state machine, scoring rules, timers, snapshots, answer persistence, clientSeq deduplication, or submit races. Trigger on mentions of attempt, autosave, submit, scoring, AttemptSnapshot, scoreQuiz, expiry sweeper, or assessment-svc.
---

# Quiz Attempt Lifecycle

This skill governs the high-write attempt execution engine in `apps/assessment`. The attempt lifecycle is the single path where a bug can lose student work or corrupt scores.

## Architecture & Entry Points

- **Routes:** `apps/assessment/src/index.ts` (`POST /v1/attempts`, `PATCH /v1/attempts/:id/answers`, `POST /v1/attempts/:id/submit`, `GET /v1/attempts/:id/result`, `GET /v1/attempts`, `GET /v1/admin/attempts`, `DELETE /v1/admin/attempts/:id`).
- **Domain Service:** `apps/assessment/src/attempt-service.ts` (`startOrResumeAttempt`, `autosaveAnswers`, `submitAttempt`, `getResult`).
- **Scoring Reference:** `apps/assessment/src/lib/scoring.ts` (`scoreQuiz`).
- **Result Formatter:** `apps/assessment/src/attempt-result.ts` (`formatAttemptResult`).
- **Expiry Sweeper & Outbox Worker:** `apps/assessment/src/worker.ts`.
- **Snapshot Client:** `apps/assessment/src/catalog-client.ts` (`fetchFullQuiz` → `GET catalog-svc:4002/internal/quizzes/:id/full`).
- **DTO Contracts:** `packages/contracts/src/dto/attempts.ts` (`AttemptQuestionDTO`, `StartAttemptResponseDTO`, `autosaveRequestSchema`, `submitAttemptRequestSchema`).
- **Events:** `packages/contracts/src/events/topics.ts` (`TOPICS.ATTEMPT_STARTED`, `TOPICS.ATTEMPT_SUBMITTED`).
- **Frontend UI:** `apps/web/app/quiz/[id]/page.tsx` and `apps/web/app/results/[id]/page.tsx`.
- **Tests:** `apps/assessment/tests/scoring.test.ts` (26 table-driven golden fixtures).

## State Machine & Invariants

```
POST /v1/attempts ──▶ IN_PROGRESS ──▶ PATCH answers (many) ──▶ POST submit ──▶ SUBMITTED
                          │                                        ▲
                          └──── expiresAt passes ──▶ sweeper ──────┘  (submitSource='sweeper')
```

1. **Answer Key Protection:** Answer keys (`correctAnswer`, `explanation`) must NEVER reach live attempts. `AttemptQuestionDTO` structurally excludes `correctAnswer`. Keys are revealed ONLY on `GET /v1/attempts/:id/result` after `status === SUBMITTED`.
2. **Snapshot Freeze:** At attempt start, `assessment-svc` calls `catalog-svc` `/internal/quizzes/:id/full` exactly ONCE and persists `AttemptSnapshot` deduped on `@@unique([quizId, contentHash])`. Scoring MUST use `AttemptSnapshot`, never the live mutable catalog quiz. This ensures mid-exam admin edits do not corrupt ongoing attempts.
3. **Single Active Attempt Guard:** One in-progress attempt per (user, quiz). Enforced by raw SQL partial unique index `attempt_one_inflight ON assessment.attempt (user_id, quiz_id) WHERE status='IN_PROGRESS'`.
4. **Server Timer Authority:** `startedAt` and `expiresAt` are set by the server clock. Client timers are UI triggers only.
5. **Autosave Sequence:** `clientSeq` monotonically increases per client tab. `autosaveAnswers` skips writes where `incoming clientSeq <= stored clientSeq` to prevent stale out-of-order writes across tabs.
6. **Submit Idempotency (CAS):** Submit executes Postgres Compare-And-Swap:
   ```sql
   UPDATE assessment.attempt SET status='SUBMITTED', submitted_at=NOW() WHERE id=$1 AND status='IN_PROGRESS';
   ```
   If 0 rows are updated, submit returns the existing stored result (idempotent replay). Postgres is the arbiter, NEVER Redis.
7. **Expiry Sweeper:** `apps/assessment/src/worker.ts` polls every `SWEEP_INTERVAL_MS` (default 15s) for `status: IN_PROGRESS, expiresAt <= NOW()`. Sweeper calls the exact same `submitAttempt(prisma, id, null, "sweeper")`. No `ATTEMPT_EXPIRED` topic exists — sweeper emits `ATTEMPT_SUBMITTED` with `submitSource='sweeper'`.

## Scoring Logic (`src/lib/scoring.ts`)

- Correct answer: `+markValue` (from snapshot section).
- Incorrect answer with negative marking enabled: `-negativeMarkValue`.
- Unanswered / skipped: `0`.
- Section score & total score floors at `0` (score cannot drop below 0).
- Fixture test suite `tests/scoring.test.ts` protects 26 golden fixture cases. Any change to scoring MUST update these fixtures in the same commit with a stated reason.

## Verification Checklist

```bash
pnpm db:generate
pnpm --filter @quiz/contracts typecheck
pnpm --filter assessment-svc typecheck
pnpm --filter assessment-svc test       # Run vitest golden fixtures
```

- Verify answer keys are omitted from `POST /v1/attempts` and `PATCH /v1/attempts/:id/answers`.
- Verify double-submit replays identical JSON result without re-executing scoring logic.
- Verify `ATTEMPT_SUBMITTED` Kafka envelope carries `key: userId` (for per-user partition ordering).
