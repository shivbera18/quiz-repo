---
name: prisma-database-change
description: Safely change Prisma models, indexes, constraints, migrations, seeds, or database access for one quiz-platform microservice. Use for schema evolution, query changes, data backfills, and database-related failures.
---

# Prisma Database Change

Preserve schema-per-service ownership and production data safety.

## Ownership

Prisma schemas live under `apps/{identity,catalog,assessment,analytics,notification}/prisma/schema.prisma`. A service may access only its own schema and database role. Cross-service data should move through APIs or events.

## Workflow

1. Identify the owning service and read its Prisma schema, related queries, seeds, outbox code, and deployment command.
2. Inspect existing migration directories before choosing a migration strategy. Never assume local schema state equals production.
3. Design additive, backward-compatible rollout steps when possible:
   - add nullable/defaulted field or new table/index;
   - deploy code that handles old and new data;
   - backfill safely;
   - add stricter constraints or remove old fields in a later deployment.
4. Update application queries and Zod contracts only where the field crosses a boundary.
5. Keep domain state changes and outbox insertion in one Prisma transaction.
6. Update seeds so they remain deterministic and do not contain real credentials or user data.
7. Generate the Prisma client and typecheck the owning service.

## Safety rules

- Do not use `prisma db push` as a substitute for committed production migrations.
- Do not reset, drop, truncate, or destructively migrate a database without explicit user approval and a backup plan.
- Do not edit an already-applied migration to change history; add a new migration.
- Avoid long blocking migrations on large tables. Consider concurrent/online index strategies and staged constraints.
- Add indexes for demonstrated query patterns; consider uniqueness, null semantics, and foreign-key behavior.
- Never copy one service's database credentials into another service.

## Commands

Use the owning package name:

```bash
pnpm --filter <service-package> prisma:generate
pnpm --filter <service-package> typecheck
pnpm --filter <service-package> test
```

`db:migrate` runs `prisma migrate deploy` and is intended for applying existing migrations. Creating a development migration may require the correct local `DATABASE_URL`; confirm before executing it.

## Completion report

State the owner, migration/backfill strategy, rollback or compatibility considerations, generated artifacts, and checks run. Clearly flag any command not run because no disposable database was available.
