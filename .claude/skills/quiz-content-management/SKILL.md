---
name: quiz-content-management
description: Master skill for subject, chapter, quiz, and question-bank CRUD operations, JSON-in-String database utility parsing, optimistic concurrency control, catalog change events, and admin editors in catalog-svc. Trigger whenever editing catalog-svc routes in apps/catalog/src/index.ts, modifying Quiz, Chapter, Subject, or QuestionBankItem models, working on admin quiz editors in apps/web/app/admin, or adjusting catalog JSON serialization logic.
---

# Quiz Content Management (Catalog Service)

`apps/catalog` (port 4002) is the sole holder of authoring data and quiz answer keys. It owns the `catalog` database schema.

## Entry Points & Infrastructure

- **API Routes:** `apps/catalog/src/index.ts` (26 endpoints).
- **AI Generation Worker:** `apps/catalog/src/ai-worker.ts`.
- **Database Utilities:** `apps/catalog/src/lib/database-utils.ts` (`parseJsonField`, `stringifyForDatabase`).
- **Prisma Schema:** `apps/catalog/prisma/schema.prisma` (`Subject`, `Chapter`, `Quiz`, `QuestionBankItem`, `AiGenerationJob`, `Outbox`).
- **Admin UI Components:** `apps/web/app/admin/manage-quizzes.tsx`, `apps/web/app/admin/QuizManagementSection.tsx`, `apps/web/app/admin/question-bank/page.tsx`.

## JSON-in-String Columns Rule

The catalog schema uses `String` columns to store structured JSON data:
- `Quiz.sections` & `Quiz.questions`
- `QuestionBankItem.options` & `QuestionBankItem.tags`

**CRITICAL INVARIANT:** Never use raw `JSON.parse()` or `JSON.stringify()` inline. Always go through `src/lib/database-utils.ts`:
```ts
import { parseJsonField, stringifyForDatabase } from "./lib/database-utils.js";

const questions = parseJsonField<FullQuizQuestionDTO[]>(quiz.questions, []);
const dbString = stringifyForDatabase(questions);
```

## Optimistic Concurrency Control (Quiz Updates)

`PATCH /v1/admin/quizzes/:id` enforces optimistic concurrency to prevent two admins from overwriting each other's edits:

1. Request body MUST supply `version: number`.
2. Update query requires matching `id` AND `version`:
   ```ts
   const updated = await prisma.quiz.updateMany({
     where: { id, version: body.version },
     data: {
       ...updateData,
       version: { increment: 1 }
     }
   });
   if (updated.count === 0) {
     throw new ConflictError("Quiz was modified by another user. Please reload.");
   }
   ```
3. Outbox `QUIZ_CHANGED` event MUST be created in the SAME transaction.

## Answer Key Isolation Rules

- **Public Routes (`GET /v1/quizzes/:id`):** Returns quiz metadata ONLY. `correctAnswer` and `explanation` are structurally omitted from responses.
- **Internal Endpoint (`GET /internal/quizzes/:id/full`):** Returns complete questions WITH `correctAnswer` and `explanation`. This route is called ONLY by `assessment-svc` at attempt start to generate immutable snapshots.

## Deletion Safety & Parent Constraints

- `DELETE /v1/admin/subjects/:id` & `DELETE /v1/admin/chapters/:id`: MUST return **`409 Conflict`** if children contain associated quizzes.
- Mutations publish `SUBJECT_CHANGED` and `CHAPTER_CHANGED` events via direct produce.

## Question Bank Validation Rules

- `POST /v1/admin/question-bank`: Requires EXACTLY **4 options** in options array. `correctAnswer` MUST be an integer `0–3`. `difficulty` defaults to `"medium"`.
- `GET /v1/admin/question-bank`: Cursor/page paginated (`limit` 1–20). Supports case-insensitive `search` over question & explanation text, plus filters for `section`, `difficulty`, and `tag`.

## Verification Checklist

```bash
pnpm --filter catalog-svc prisma:generate
pnpm --filter catalog-svc typecheck
```

- Verify PATCH `/v1/admin/quizzes/:id` returns 409 when `version` is outdated.
- Verify `GET /v1/quizzes/:id` does not expose `correctAnswer`.
- Verify JSON columns use `parseJsonField` and handle empty/null strings safely.
