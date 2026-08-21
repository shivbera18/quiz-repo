---
name: prisma-database-change
description: Master skill for modifying Prisma models, running migrations, writing migrations, generating client types, adding indexes, updating database schemas, and seeding databases. Trigger whenever editing any prisma/schema.prisma file, running db:migrate or db:generate, changing Postgres indexes, altering search_path, or modifying schema-per-service isolation in identity, catalog, assessment, analytics, or notification services.
---

# Prisma Database Changes

The platform uses a **Schema-Per-Service** architecture over a single PostgreSQL instance (`quiz`). Cross-schema foreign keys and joins are physically prohibited by Postgres role grants.

## Postgres Infrastructure & Roles

- **Database:** `quiz` on port `5433` (host) / `5432` (container).
- **Init Script:** `infra/postgres/init/01-schemas-roles.sh` (executes once on volume creation).
- **5 Schemas & Roles:**
  - `identity` schema → Owned by role `identity_rw` (`search_path = identity`)
  - `catalog` schema → Owned by role `catalog_rw` (`search_path = catalog`)
  - `assessment` schema → Owned by role `assessment_rw` (`search_path = assessment`)
  - `analytics` schema → Owned by role `analytics_rw` (`search_path = analytics`)
  - `notification` schema → Owned by role `notification_rw` (`search_path = notification`)

Because `search_path` is pinned per role, Prisma schemas DO NOT need `multiSchema` or `@@schema` annotations.

## 5 Prisma Schemas Overview

| Service | Schema Location | Key Models | Notes |
|---|---|---|---|
| **identity** | `apps/identity/prisma/schema.prisma` | `User`, `Outbox` | `seed.ts` upserts admin & student |
| **catalog** | `apps/catalog/prisma/schema.prisma` | `Subject`, `Chapter`, `Quiz`, `QuestionBankItem`, `AiGenerationJob`, `Outbox` | `sections` & `questions` stored as JSON-in-String |
| **assessment** | `apps/assessment/prisma/schema.prisma` | `Attempt`, `AttemptSnapshot`, `AttemptAnswer`, `QuizResult` (legacy), `Outbox` | Contains 2 partial unique indexes in raw SQL |
| **analytics** | `apps/analytics/prisma/schema.prisma` | 15 models (`DimUser`, `DimQuiz`, `AttemptFact`, `QuestionStat`, `UserStats`, `QuizStats`, `DailyRollup`, `ExportJob`, etc.) | Read models built from events |
| **notification** | `apps/notification/prisma/schema.prisma` | `Announcement`, `AnnouncementRead`, `PushSubscription`, `UserRef`, `ProcessedEvent`, `Outbox` | Web-push & announcement models |

## Mandatory Generator Settings

Every `schema.prisma` MUST use service-local client generation and Alpine OpenSSL binary targets:

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

- `output` MUST be service-local (`../src/generated/prisma`) so pnpm workspace hoisting does not cause services to clobber each other.
- `linux-musl-openssl-3.0.x` is REQUIRED for Alpine Docker containers.
- `**/generated/prisma/` is gitignored → `pnpm db:generate` MUST run before typechecking or building.

## Migration Rules & Workflows

1. **Never use `prisma migrate dev` on live/production databases.** ALWAYS use `prisma migrate deploy`.
2. **No Foreign Keys Across Schemas:** Cross-service references MUST be soft string fields (e.g. `quizId String`).
3. **Hand-Crafted Raw SQL Indexes:** Prisma cannot express partial indexes. When creating a migration SQL file, append hand-crafted SQL for partial indexes:
   ```sql
   -- assessment partial unique index for single active attempt:
   CREATE UNIQUE INDEX attempt_one_inflight ON assessment.attempt (user_id, quiz_id) WHERE status = 'IN_PROGRESS';

   -- assessment sweeper performance index:
   CREATE INDEX attempt_sweeper ON assessment.attempt (expires_at) WHERE status = 'IN_PROGRESS';
   ```
4. **Running Migrations inside Docker:**
   ```bash
   docker compose -f infra/docker-compose.yml exec identity-svc     pnpm db:migrate
   docker compose -f infra/docker-compose.yml exec catalog-svc      pnpm db:migrate
   docker compose -f infra/docker-compose.yml exec assessment-svc   pnpm db:migrate
   docker compose -f infra/docker-compose.yml exec analytics-svc    pnpm db:migrate
   docker compose -f infra/docker-compose.yml exec notification-svc pnpm db:migrate
   ```

## Verification Checklist

```bash
pnpm db:generate                          # Generate all 5 Prisma clients
pnpm typecheck                            # Verify TypeScript integration across monorepo
```

- Verify new migration SQL file contains appropriate index declarations.
- Verify `schema.prisma` output path points to `../src/generated/prisma`.
- Verify role permissions if new tables are added in `01-schemas-roles.sh`.
