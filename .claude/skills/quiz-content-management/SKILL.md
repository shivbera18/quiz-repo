---
name: quiz-content-management
description: Build or modify subjects, chapters, quizzes, question-bank entries, admin editors, imports, activation, and catalog change events. Use for quiz CRUD and content-authoring workflows.
---

# Quiz Content Management

Keep catalog content valid, editable by admins, and safe for students.

## Entry points

- Catalog API and validation: `apps/catalog/src/index.ts`.
- Catalog schema and seed: `apps/catalog/prisma/`.
- Public DTOs: `packages/contracts/src/dto/catalog.ts`.
- Admin UI: `apps/web/app/admin/manage-quizzes.tsx`, `QuizManagementSection.tsx`, `quiz/[id]/`, and `question-bank/`.
- Next.js proxy routes: `apps/web/app/api/admin/`.
- Admin E2E: `apps/web/tests-e2e/admin-edit-flow.spec.ts`.

## Data boundaries

- Public quiz DTOs must contain metadata only and no answer keys.
- Full quiz questions with correct answers belong only on catalog's internal endpoint used by assessment.
- Admin endpoints require service-side admin enforcement; hiding controls in the UI is insufficient.
- Catalog owns quiz-to-chapter-to-subject relationships. Other services consume change events or internal APIs rather than reading catalog tables.

## Workflow

1. Trace public, admin, and internal representations of the content being changed.
2. Validate title length, duration, sections, question shape, exactly four options where required, correct-answer bounds, negative marking, and relationship IDs.
3. Perform multi-record quiz/question updates transactionally so partial edits cannot leak.
4. Increment/preserve quiz version semantics and emit `QUIZ_CHANGED`, `CHAPTER_CHANGED`, or `SUBJECT_CHANGED` after domain changes using the established outbox/event pattern.
5. Decide what happens to active attempts: existing attempts must continue from their snapshots.
6. Keep partially generated/imported content inactive until an admin reviews it.
7. Add admin UI feedback for validation conflicts and unsaved operations.

## Deletion checklist

Before deleting, inspect foreign keys, active attempts, historical analytics dimensions, and child records. Prefer explicit conflict/archive/deactivation semantics when deletion would damage history. Do not cascade across service-owned databases.

## Verification

```bash
pnpm --filter catalog-svc prisma:generate
pnpm --filter catalog-svc typecheck
pnpm --filter @quiz/contracts typecheck
pnpm --filter web typecheck
pnpm --filter web test:e2e -- admin-edit-flow.spec.ts
```

Document public/internal DTO impact, version behavior, emitted events, and historical-data implications.
