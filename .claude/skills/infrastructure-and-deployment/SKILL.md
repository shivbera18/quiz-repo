---
name: infrastructure-and-deployment
description: Master skill for Docker, Docker Compose, environment variables, GitHub Actions workflows, Caddy reverse proxy, EC2 production deployments, local stack orchestration, and database container init scripts. Trigger whenever editing infra/docker-compose*.yml, infra/Caddyfile, .github/workflows/*.yml, infra/postgres/init/01-schemas-roles.sh, or troubleshooting deployment scripts.
---

# Infrastructure, Docker & Deployment

The application platform consists of 12 processes (1 Web + 1 Gateway + 5 Microservices + 5 Workers) orchestrated via Turborepo and Docker Compose under project name `quiz-platform`.

## Container Stack & Port Allocations

| Container / Service | Image | Host Port | In-Cluster Address |
|---|---|---|---|
| **postgres** | `postgres:16-alpine` | `5433` → 5432 | `postgres:5432` |
| **redis** | `redis:7-alpine` | `6380` → 6379 | `redis:6379` |
| **redpanda** | `redpandadata/redpanda:v24.2.18` | `19092`, 8082, 9644 | `redpanda:9092` |
| **redpanda-console** | `redpandadata/console:v2.7.2` | `8090` → 8080 | — |
| **minio** | `minio/minio:latest` | `9000` (API), `9001` (Console) | `minio:9000` |
| **minio-init** | `minio/mc:latest` | One-shot bucket creator | Creates `quiz-exports` |
| **web** | Built from `apps/web/Dockerfile` | `3000` | `web:3000` |
| **gateway** | Built from `apps/gateway/Dockerfile` | `4000` | `gateway:4000` |
| **identity-svc** | Built from `apps/identity/Dockerfile` | `4001` | `identity-svc:4001` |
| **catalog-svc** (+ai-worker) | Built from `apps/catalog/Dockerfile` | `4002` | `catalog-svc:4002` |
| **assessment-svc** (+worker) | Built from `apps/assessment/Dockerfile` | `4003` | `assessment-svc:4003` |
| **analytics-svc** (+2 workers) | Built from `apps/analytics/Dockerfile` | `4004` | `analytics-svc:4004` |
| **notification-svc** (+worker) | Built from `apps/notification/Dockerfile` | `4005` | `notification-svc:4005` |

*Note: Host ports 5433 & 6380 use offsets to avoid colliding with local PostgreSQL/Redis instances.*

## Common Docker Commands

```bash
pnpm compose:up             # Start all containers in background
pnpm compose:logs           # Tail container logs
pnpm compose:down           # Stop containers (add -v to remove volumes)
pnpm compose:prod:up        # Start with prod overlay (Caddy, host ports removed)

# Exec into container for migrations:
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec catalog-svc pnpm db:seed
```

## Production Overlay & Caddy (`infra/docker-compose.prod.yml`)

In production (`docker-compose.prod.yml`):
- Adds `caddy` container binding ports `80` and `443` using `infra/Caddyfile`.
- Reverse proxies external requests (`16-170-103-71.sslip.io`) to `gateway:4000`.
- **Empties host `ports: []`** for gateway, all 5 microservices, postgres, redis, redpanda, and minio so internal backend services are physically unexposed to the host network.

## CI/CD Workflows (`.github/workflows/`)

1. **`ci.yml` (Continuous Integration):**
   - Triggers on push to `main` and all pull requests.
   - Runs: `pnpm install --frozen-lockfile` → `pnpm db:generate` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm --filter web build`.
2. **`deploy-ec2.yml` (EC2 Deployment):**
   - Triggers on push to `main` (excluding `apps/web/**` which deploys to Vercel).
   - Remote SSH execution (`ubuntu@EC2_HOST`):
     - `git reset --hard origin/main`.
     - Sets `COMPOSE_PARALLEL_LIMIT=1` to build services sequentially (optimizes BuildKit cache reuse).
     - Runs `docker compose up -d --remove-orphans`.
     - Runs `db:migrate` & `db:seed` per container.
3. **`db-backup.yml` (Database Backups):** Nightly 02:00 UTC `pg_dumpall` backup uploaded to GitHub artifacts.

## Verification Checklist

```bash
docker compose -f infra/docker-compose.yml config    # Validate Compose file syntax
```

- Verify Postgres container runs `01-schemas-roles.sh` on volume creation.
- Verify production overlay (`docker-compose.prod.yml`) removes exposed host ports.
- Verify `infra/.env` dev defaults match `docker-compose.yml` environment blocks.
