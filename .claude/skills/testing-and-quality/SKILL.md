---
name: testing-and-quality
description: Create, repair, or run unit, integration, and Playwright end-to-end tests for the quiz platform. Use for regressions, acceptance criteria, flaky tests, scoring tests, browser flows, and pre-merge verification.
---

# Testing and Quality

Choose the smallest test layer that proves the behavior, then broaden verification based on risk.

## Existing tools

- Vitest is currently configured in at least `assessment-svc` for scoring/service tests.
- Playwright is configured in `apps/web/playwright.config.ts` for browser flows.
- Turborepo exposes root `test` and `test:e2e` tasks.
- TypeScript checks exist in every workspace package.

Inspect actual paths and package scripts before adding tests; do not rely only on architecture documentation because code and docs can drift.

## Workflow

1. Translate the requirement or bug into observable acceptance cases.
2. Locate the nearest existing test and copy its conventions.
3. Add a regression test that fails for the original defect before or alongside the fix when practical.
4. Cover boundaries: invalid input, auth/role failures, empty state, time expiry, duplicate submission, retries, and downstream failure as relevant.
5. Keep tests deterministic: control time and randomness, use stable seeded data, and avoid arbitrary sleeps.
6. For distributed behavior, assert persisted outcomes and idempotency rather than only "message was sent."
7. For Playwright, prefer accessible role/label selectors or stable test IDs over CSS structure and text that changes frequently.
8. Clean up created data or use isolated identifiers.

## Quiz-specific invariants

Prioritize tests for server-side scoring, answer secrecy before completion, attempt ownership, timer expiry, one-time/final submission semantics, admin authorization, leaderboard idempotency, and notification deduplication.

## Commands

```bash
pnpm --filter assessment-svc test
pnpm --filter web test:e2e
pnpm --filter <package> typecheck
pnpm test
pnpm test:e2e
```

Playwright may require seeded backend services and environment variables. Read `apps/web/playwright.config.ts` and its global setup first. If configured paths do not match files on disk, report and fix the configuration deliberately rather than moving files blindly.

## Completion report

List scenarios added, commands and results, untested risks, and environmental blockers. Never claim a test passed unless it was actually run successfully.
