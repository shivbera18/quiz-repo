---
name: ai-quiz-generation
description: Master skill for Gemini AI quiz generation, async catalog worker jobs, section-by-section streaming persistence, prompt parsing, retry handling, partial generation review drafts, and AI generation API routes. Trigger whenever modifying apps/catalog/src/ai-worker.ts, editing AiGenerationJob model, updating Gemini prompts, adjusting AI generation endpoints in catalog-svc, or fixing AI quiz creation bugs.
---

# AI Quiz Generation Engine

AI quiz generation is an asynchronous, two-tier process in `apps/catalog`. The Fastify API receives the request and returns `202 Accepted`, while `catalog-ai-worker` processes sections asynchronously via Google Gemini (`gemini-1.5-flash`).

## Entry Points & Infrastructure

- **API Routes:** `apps/catalog/src/index.ts` (`POST /v1/ai/quiz-generations`, `GET /v1/ai/quiz-generations/:jobId`).
- **AI Worker Process:** `apps/catalog/src/ai-worker.ts` (`groupId: "catalog-ai-worker"`).
- **Prisma Model:** `AiGenerationJob` in `apps/catalog/prisma/schema.prisma`.
- **Kafka Topics:** `TOPICS.AI_QUIZ_GENERATION_REQUESTED`, `TOPICS.AI_QUIZ_GENERATION_COMPLETED`.
- **UI Frontend Component:** `apps/web/app/admin/ai-quiz-generator.tsx`.

## Job Lifecycle & State Machine

```
POST /v1/ai/quiz-generations ──▶ AiGenerationJob(pending) ──▶ Emit AI_QUIZ_GENERATION_REQUESTED ──▶ 202 { jobId }
                                                                             │
                                                                             ▼
catalog-ai-worker ──▶ AiGenerationJob(processing) ──▶ Loop sections ──▶ Save partialQuestions per section
                                                                             │
                                                                             ▼
                                                  Create Quiz (isActive = status === 'succeeded')
                                                  Emit AI_QUIZ_GENERATION_COMPLETED
```

1. **Request Submission:**
   - Validates `x-user-id` header (401), title, difficulty, and sections array.
   - Rate limited by gateway policy `aiGenByUser` (5 req / hour per user).
   - Creates `AiGenerationJob` with status `pending`.
   - Emits `AI_QUIZ_GENERATION_REQUESTED` directly (keyed by `jobId`).
   - Returns **`202 Accepted`** with `{ jobId }`.
2. **Worker Execution (`src/ai-worker.ts`):**
   - Consumer group `catalog-ai-worker` configured with `maxPollIntervalMs: 15 * 60_000` (15 min) to prevent rebalance timeouts during long Gemini calls.
   - Updates job status to `processing`.
3. **Per-Section Streaming Persistence:**
   - Worker loops through requested sections. For each section, calls Gemini `gemini-1.5-flash` requesting 4 options (0-3 correct answer), explanation, and tags.
   - **Per-Section Save Rule:** `partialQuestions` JSON field is written to DB after *each* section succeeds. If section 3 fails, sections 1 and 2 remain safe in the database.
4. **Draft Quiz Creation:**
   - If any questions were successfully generated, creates a new `Quiz` record.
   - `isActive = (status === "succeeded")`. If any section failed (`status === "partial"`), the quiz is created as an **inactive draft** (`isActive: false`) for admin review.
5. **Job Completion:**
   - Updates `AiGenerationJob` status to `succeeded`, `partial`, or `failed`.
   - Emits `AI_QUIZ_GENERATION_COMPLETED` containing counts, duration, and section failures.
6. **UI Polling:** Next.js client polls `GET /v1/ai/quiz-generations/:jobId` until status is `succeeded`, `partial`, or `failed`.

## Error Handling & Environmental Safety

- **Missing `GEMINI_API_KEY`:** If `GEMINI_API_KEY` is not set or invalid, worker marks job status `failed` with descriptive error message — it MUST NEVER crash the process.
- **Malformed JSON from LLM:** Parses candidate text extracting first `{ ... }` block. If JSON parsing fails, logs warning, records section failure in `failures[]`, and continues to next section.

## Verification Checklist

```bash
pnpm --filter catalog-svc typecheck
```

- Verify worker consumer has `maxPollIntervalMs: 15 * 60_000`.
- Verify partial generation failure creates quiz with `isActive: false`.
- Verify `partialQuestions` updates after every individual section completes.
