# Deployment follow-ups — 2026-08-26

PRs merged today that change the DATABASE SCHEMA or runtime behavior on the
AWS EC2 deployment: **#16, #17, #18, #19** (plus docs-only #15).

Do these at the next deploy. Nothing here is optional — two new migrations
exist and running code WILL query the new columns.

---

## 1. Migrations (REQUIRED)

Two services have pending migrations:

| Service | Migration | What it adds |
|---|---|---|
| `assessment-svc` | `20260826140500_attempt_section_scores` | nullable `Attempt.sectionScores` JSONB column |
| `assessment-svc` | `20260826142000_notebook_items` | `NotebookItem` table + `NotebookKind` enum + unique constraint + 2 indexes |
| `catalog-svc` | `202608261063000_outbox_payload_nullable` | drops NOT NULL on `Outbox.payload` |
| `catalog-svc` | `20260826070000_question_bank_indexes` | 3 btree indexes on `QuestionBankItem` |

Run AFTER the updated images are up:

```bash
docker compose -f infra/docker-compose.yml exec assessment-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec catalog-svc    pnpm db:migrate
```

> **Ordering warning:** today's deploy script starts containers first and
> runs migrations after (`|| true`). Between container start and migration,
> assessment-svc will error on any attempt submit because `sectionScores`
> does not exist yet — it recovers as soon as the migration lands, but do
> not treat those first minutes of 500s as a code bug. Verify both
> migrations actually applied:
>
> ```bash
> docker compose -f infra/docker-compose.yml exec postgres \
>   psql -U quiz_admin -d quiz -c "\d assessment.\"Attempt\"" | Select-String sectionScores
> docker compose -f infra/docker-compose.yml exec postgres \
>   psql -U quiz_admin -d quiz -c "\dt catalog.* notebook" # catalog Outbox check instead:
> docker compose -f infra/postgres/init/01-schemas-roles.sh --help 2>/dev/null || true
> ```

Simpler existence checks:

```bash
docker compose -f infra/docker-compose.yml exec postgres psql -U quiz_admin -d quiz \
  -c "SELECT column_name FROM information_schema.columns WHERE table_schema='assessment' AND table_name='Attempt' AND column_name='sectionScores';"
docker compose -f infra/docker-compose.yml exec postgres psql -U quiz_admin -d quiz \
  -c "SELECT to_regclass('assessment.\"NotebookItem\"');"
```

Both must return a row / a table name.

## 2. Rebuild & restart ALL services

`packages/contracts` and `packages/kafka-kit` changed, which every backend
service depends on. Rebuild everything, not just assessment/catalog:

```bash
git pull origin main
docker compose -f infra/docker-compose.yml build
docker compose -f infra/docker-compose.yml up -d
```

(assessment-worker, catalog-ai-worker and analytics export-worker restart
via the same compose project.)

## 3. No environment changes required

- No new env vars (scheduling uses no config; DLQ producer reuses existing Kafka settings).
- Redis: unchanged; **still no persistence volume** — leaderboards reset on recreate (known gap O2).
- MinIO: unchanged.

## 4. Kafka DLQ topics

Per-topic dead-letter queues (`<topic>.dlq`) are created automatically by the
broker on first dead-letter publish. After the deploy, glance at Redpanda
Console (http://localhost:8090 on the VM) once per environment to confirm
they appear only when needed. Optional hardening: pre-create them with an
explicit retention policy (follow-up O5).

## 5. Post-deploy smoke checklist

1. `curl http://localhost:4000/healthz` and each service's `/healthz`.
2. Submit one quiz → verify `assessment."Attempt".section_scores` is non-null for it.
3. Open `/dashboard/notebook` (empty state OK) and `/history` — titles render, Retake visible.
4. In an admin editor set a schedule window in the future → starting the quiz shows "opens at ..." screen.
5. Question bank admin list still loads (new indexes are additive).
6. If any consumer misbehaves, check for `<topic>.dlq` in Redpanda Console before rolling back.

## 6. Rollback caveat

The current pipeline builds on the VM and prunes old images immediately —
there is NO image-level rollback. Until O4 lands, take a filesystem snapshot
of the VM (or `docker save` the previous images) BEFORE deploying today's
changes.

---

*Migrations are idempotent-safe to re-run via `migrate deploy`; never run
`prisma migrate dev` against this database.*
