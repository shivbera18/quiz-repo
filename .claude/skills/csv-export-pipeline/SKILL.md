---
name: csv-export-pipeline
description: Change or debug asynchronous analytics CSV exports, filters, pagination, formula escaping, MinIO uploads, job status, download expiry, and large-data memory behavior.
---

# CSV Export Pipeline

Keep exports bounded-memory, authorized, auditable, and safe to open in spreadsheets.

## Entry points

- Request/status API: `apps/analytics/src/index.ts` under `/v1/admin/exports`.
- Worker: `apps/analytics/src/export-worker.ts`.
- CSV escaping: `apps/analytics/src/csv.ts`.
- Object storage: `apps/analytics/src/object-store.ts`.
- Event types: `ExportRequestedData` and `ExportCompletedData`.
- MinIO services/bucket: `infra/docker-compose.yml`.

## Invariants

- Export creation and status access require admin authorization in analytics, not just in the UI/gateway.
- Preserve keyset pagination and streaming upload; never accumulate all rows or the full CSV in memory.
- Use a stable unique cursor and deterministic order. If ordering by a non-unique column, add a unique tiebreaker.
- Escape CSV delimiters, quotes, CR/LF, and spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tabs) in untrusted fields.
- Validate filter dates, ranges, IDs, export kind, and maximum scope.
- Object keys must be server-generated and constrained to the export bucket.
- Download URLs expire; storing an object key is preferable to persisting a stale signed URL.
- Duplicate requested events must not generate conflicting jobs or completion events.

## Workflow

1. Trace request → job/outbox/event → worker → MinIO → status/download response.
2. Keep job states monotonic: queued → running → done/failed.
3. Clarify whether `rowCount` excludes the header and retain that contract.
4. Ensure failed multipart uploads are aborted/cleaned up where supported.
5. Avoid returning raw provider/internal error details to clients.
6. Test empty exports, exactly one page, page boundary, large data, malicious spreadsheet values, MinIO failure, duplicate events, invalid filters, and expired links.

## Verification

```bash
pnpm --filter analytics-svc typecheck
docker compose -f infra/docker-compose.yml config
```

For streaming changes, measure memory with multi-page fixture data. Report export schema changes because downstream spreadsheet users may depend on column names/order.
