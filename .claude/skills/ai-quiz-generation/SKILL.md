---
name: ai-quiz-generation
description: Change or debug Gemini-based asynchronous quiz generation, job status, partial results, prompt output validation, retries, deduplication, and admin review in catalog-svc.
---

# AI Quiz Generation

Treat model output as untrusted data and generation as a resumable asynchronous job.

## Entry points

- Request/status endpoints: `apps/catalog/src/index.ts` under `/v1/ai/quiz-generations`.
- Worker: `apps/catalog/src/ai-worker.ts`.
- Job and quiz models: `apps/catalog/prisma/schema.prisma`.
- Event contracts: AI generation types in `packages/contracts/src/events/topics.ts`.
- UI/proxies: `apps/web/app/admin/ai-quiz-generator.tsx`, `question-bank/ai-generator.tsx`, and `app/api/ai/`.
- Runtime: `catalog-ai-worker` in `infra/docker-compose.yml`.

## Required behavior

- Validate request limits for sections, difficulty, and question count before enqueueing.
- Rate-limit generation at the gateway and authorize admin-only behavior in catalog.
- Validate Gemini output structurally and semantically: expected count, non-empty text, exactly four options, unique/plausible options, integer answer index `0..3`, section, explanation, and tags.
- Never trust regex extraction plus `JSON.parse` as sufficient validation; use a Zod schema after extracting model JSON.
- Persist each successful section immediately so one failed section does not discard prior work.
- A partial job creates an inactive draft for admin review; failed jobs do not activate content.
- Preserve the extended Kafka poll interval for long jobs unless processing is redesigned.
- Do not log full prompts/responses when they can contain sensitive or excessive content.

## Idempotency warning

`apps/catalog/src/ai-worker.ts` currently documents that `hasProcessed` always returns `false`. Any work involving retries, duplicates, scaling workers, or reliability must address this with a real `ProcessedEvent` record keyed by `envelope.eventId`, stored transactionally with job state. Do not claim exactly-once behavior while this stub remains.

## Workflow

1. Trace job creation, requested event, worker transition, draft creation, completed event, polling UI, and timeout/error states.
2. Make job transitions monotonic: queued → in_progress → succeeded/partial/failed.
3. Define retry semantics per failed section and ensure retry cannot create duplicate quizzes.
4. Test malformed JSON, markdown-wrapped JSON, wrong option counts, invalid answer indexes, provider errors, partial success, duplicate event, and missing API key.

## Verification

```bash
pnpm --filter catalog-svc typecheck
pnpm --filter @quiz/contracts typecheck
pnpm --filter web typecheck
```

Run a real generation only with explicit approval because it uses an external paid API. Report mocked versus live validation clearly.
