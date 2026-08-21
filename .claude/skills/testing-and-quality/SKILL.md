---
name: testing-and-quality
description: Master skill for unit testing, scoring golden fixtures, Vitest execution, Playwright e2e specs, ESLint verification, and test-driven quality assurance. Trigger whenever running or writing tests, modifying apps/assessment/tests/scoring.test.ts, working on apps/web/tests-e2e/, updating vitest or playwright configs, or performing pre-merge quality verification.
---

# Testing & Quality Assurance

This skill governs unit, integration, and end-to-end verification across the monorepo.

## Monorepo Test Inventory

| Suite / Test Target | Path | Runner | Description |
|---|---|---|---|
| **Scoring Golden Fixtures** | `apps/assessment/tests/scoring.test.ts` | Vitest | 26 table-driven fixtures testing score calculation, negative marking, section totals, and 0-score floor. **THE SINGLE SAFETY NET FOR SCORING.** |
| **Web E2E Quiz Flow** | `apps/web/tests-e2e/quiz-flow.spec.ts` | Playwright | Student quiz taking, timer rendering, autosave, and result submission. |
| **Web E2E Admin Flow** | `apps/web/tests-e2e/admin-edit-flow.spec.ts` | Playwright | Admin quiz creation, question editing, and propagation. |

## Scoring Test Rule

`apps/assessment/tests/scoring.test.ts` protects the core scoring engine (`scoreQuiz` in `apps/assessment/src/lib/scoring.ts`).
**INVARIANT:** Any change to scoring logic MUST be accompanied by updated or new golden fixtures in `scoring.test.ts` in the exact same commit, with an explicit stated reason for the score semantics shift.

## The Verification Ladder

Execute steps in order before submitting code or merging PRs:

```bash
# 1. Mandatory Schema Generation & Typecheck:
pnpm db:generate
pnpm typecheck

# 2. Assessment Scoring Unit Tests (Vitest):
pnpm --filter assessment-svc test

# 3. Web Linting (ESLint):
pnpm --filter web lint

# 4. Standalone Web Production Build:
pnpm --filter web build

# 5. Full Container Stack Smoke Verification:
pnpm compose:up
curl http://localhost:4000/healthz
```

## Manual Infrastructure Verification

- **Event Flow Verification:** Open **Redpanda Console** (http://localhost:8090). Inspect topic payload envelopes and verify consumer group lag is `0` for `analytics-rollup-consumer` and `notification-fanout-worker`.
- **Export Verification:** Open **MinIO Console** (http://localhost:9001, `minioadmin`/`minioadmin`). Verify generated CSV files exist under `quiz-exports` bucket.
- **Database Role Verification:** Execute `docker compose exec postgres psql -U assessment_rw -d quiz` to verify schema search paths and role grants.

## Verification Checklist

- Verify `pnpm db:generate` was run before running typechecks.
- Verify `pnpm --filter assessment-svc test` passes with 26/26 golden fixtures succeeding.
- Verify `pnpm --filter web build` compiles cleanly without dynamic import or parameter errors.
