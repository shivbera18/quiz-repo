---
name: csv-export-pipeline
description: Master skill for asynchronous analytics CSV exports, streaming data pipelines, CSV formula escaping, S3 MinIO uploads, presigned download URLs, and export workers. Trigger whenever modifying analytics export-worker.ts, editing csv.ts, updating ExportJob model, adjusting S3/MinIO upload logic, or working on export API endpoints in analytics-svc.
---

# CSV Export Pipeline

`apps/analytics` provides asynchronous, stream-based CSV exports for large datasets. It uses AWS S3 SDK with MinIO locally to support multi-gigabyte exports without memory spikes.

## Architecture & Core Files

- **Export Request Endpoint:** `apps/analytics/src/index.ts` (`POST /v1/admin/exports`, `GET /v1/admin/exports/:id`).
- **Export Worker:** `apps/analytics/src/export-worker.ts` (`groupId: "analytics-export-worker"`).
- **S3 / MinIO Client:** `apps/analytics/src/object-store.ts` (`EXPORT_BUCKET = "quiz-exports"`).
- **CSV Escaping Utilities:** `apps/analytics/src/csv.ts` (`csvEscape`, `csvRow`).
- **Prisma Model:** `ExportJob` in `apps/analytics/prisma/schema.prisma`.
- **Kafka Topics:** `TOPICS.EXPORT_REQUESTED`, `TOPICS.EXPORT_COMPLETED`.

## Asynchronous Export Lifecycle

```
POST /v1/admin/exports ──▶ ExportJob(pending) ──▶ Emit EXPORT_REQUESTED ──▶ 202 { jobId }
                                                              │
                                                              ▼
analytics-export-worker ──▶ ExportJob(running) ──▶ Stream Prisma rows ──▶ S3 Upload multipart
                                                              │
                                                              ▼
                                               ExportJob(done, objectKey, rowCount)
                                               Emit EXPORT_COMPLETED
```

1. **Request Submission (`POST /v1/admin/exports`):**
   - Requires admin role. Rate limited by `exportByUser` (3 req / 60 min per user).
   - Accepts `kind` (`"quiz-results"` or `"user-performance"`) and optional `filters` (`from`, `to`, `quizIds`, `subjectIds`).
   - Creates `ExportJob` record with status `pending`.
   - Direct-produces `EXPORT_REQUESTED` event.
   - Returns **`202 Accepted`** with `{ jobId }`.
2. **Worker Execution (`src/export-worker.ts`):**
   - `maxPollIntervalMs: 15 * 60_000` (15 min) configured on consumer to prevent rebalances during massive table scans.
   - Updates `ExportJob` status to `running`.
3. **Constant Memory Streaming Generator:**
   - **Prisma Keyset Pagination (`PAGE_SIZE = 500`):** Iterates over records in pages using cursor `take: PAGE_SIZE, skip: 1, cursor: { id }`.
   - **Stream Pipelining:** Wraps async generator in `Readable.from(...)` and pipes directly to `@aws-sdk/lib-storage` `Upload`.
   - Memory consumption remains constant ($O(1)$) regardless of whether exporting 1,000 or 1,000,000 rows.
4. **CSV Security (`csvEscape` in `src/csv.ts`):**
   - **Formula Injection Defense:** Any string starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a leading single quote (`'`). This prevents Excel macro execution vulnerabilities when exported CSVs are opened.
5. **MinIO Upload & Presigned Download URL:**
   - Saved to S3 bucket `quiz-exports` under key `${kind}/${jobId}.csv`.
   - `GET /v1/admin/exports/:id` checks `status === "done"` and returns presigned S3 GET URL (`downloadUrl`, valid for **24 hours**).

## Verification Checklist

```bash
pnpm --filter analytics-svc typecheck
```

- Verify formula injection inputs (e.g. `=SUM(A1:A10)`) are escaped as `'=SUM(A1:A10)`.
- Verify export worker uses `Readable.from` stream upload instead of `fs.readFileSync` or array buffering.
- Inspect uploaded CSV files in MinIO Console (http://localhost:9001, `minioadmin`/`minioadmin`).
