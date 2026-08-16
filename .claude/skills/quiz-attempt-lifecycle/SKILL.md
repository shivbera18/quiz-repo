---
name: quiz-attempt-lifecycle
description: Change or debug starting, resuming, autosaving, expiring, submitting, scoring, and displaying quiz attempts. Use for attempt races, timers, answer persistence, snapshots, scoring, result access, and duplicate submissions.
---

# Quiz Attempt Lifecycle

Work on the complete attempt path without weakening quiz integrity.

## Entry points

- API routes: `apps/assessment/src/index.ts`.
- Domain logic: `apps/assessment/src/attempt-service.ts`.
- Scoring: `apps/assessment/src/lib/scoring.ts`.
- Result formatting: `apps/assessment/src/attempt-result.ts`.
- Expiry sweeper: `apps/assessment/src/worker.ts`.
- Catalog snapshot fetch: `apps/assessment/src/catalog-client.ts`.
- DTOs: `packages/contracts/src/dto/attempts.ts`.
- Events: `packages/contracts/src/events/topics.ts`.
- UI: `apps/web/app/quiz/[id]/page.tsx` and `apps/web/app/results/[id]/page.tsx`.
- Tests: `apps/assessment/tests/scoring.test.ts` and `apps/web/tests-e2e/quiz-flow.spec.ts`.

## Non-negotiable invariants

- Never send `correctAnswer` or explanations that reveal answers before submission.
- Score only against `AttemptSnapshot`, never the current mutable catalog quiz.
- Freeze quiz title, version, timing, negative marking, questions, and user identity at attempt start.
- Allow only one in-progress attempt per user and quiz; retain the database partial unique index as the final race guard.
- Use server time and `expiresAt` as authoritative. Client timers are display and submission triggers only.
- Ignore stale autosaves using monotonically increasing `clientSeq`.
- Enforce attempt ownership and return not-found behavior that does not disclose another user's attempt.
- Submission must be idempotent when user, timer, retry, and sweeper race.
- Keep score persistence, answer outcomes, and `ATTEMPT_SUBMITTED` outbox insertion atomic.

## Workflow

1. Map the state transition: `IN_PROGRESS` to `SUBMITTED` or `EXPIRED`.
2. Check both API and sweeper callers whenever changing `submitAttempt`.
3. Preserve the Postgres compare-and-set on status; do not replace it with an in-memory check.
4. Validate answer question IDs and sections against the snapshot when changing autosave behavior.
5. Update event payloads and analytics consumers when score semantics change.
6. Add tests for double start, stale autosave, expiration boundary, concurrent submit, negative marking, unanswered questions, and result ownership as relevant.

## Verification

```bash
pnpm --filter @quiz/contracts typecheck
pnpm --filter assessment-svc typecheck
pnpm --filter assessment-svc test
pnpm --filter web typecheck
pnpm --filter web test:e2e
```

Report state transitions changed, race handling, scoring compatibility, emitted-event changes, and checks run.
