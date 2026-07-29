# Hosting Guide

How to run this app **locally** and put it **online**, as the codebase stands today: a Turborepo/pnpm monorepo of one gateway, five backend services, and a Next.js frontend, talking to one shared Postgres (schema-per-service), Redis, Kafka (via Redpanda), and MinIO/S3. See [ARCHITECTURE.md](ARCHITECTURE.md) for the design rationale behind every one of these pieces — this document is just the operational "how do I actually run it" companion.

If you're looking for the old single-Next.js-app hosting instructions (Vercel + Neon, no separate services): that version of the app no longer exists in this codebase. Everything below reflects the current, split architecture.

**Already have an Oracle VPS + Vercel and just want the exact deploy steps + auto-deploy-on-push setup?** See [DEPLOYMENT.md](DEPLOYMENT.md) instead — it's the tight operational checklist for that specific topology. This document is the broader reference (all hosting options, every env var, every known gap).

## Contents

- [System overview](#system-overview)
- [Prerequisites](#prerequisites)
- [Part 1 — Local development with Docker Compose](#part-1--local-development-with-docker-compose)
- [Part 2 — Running one service outside Docker](#part-2--running-one-service-outside-docker)
- [Part 3 — Tests](#part-3--tests)
- [Part 4 — Hosting online](#part-4--hosting-online)
- [Part 5 — Environment variables reference](#part-5--environment-variables-reference)
- [Part 6 — Production database migrations](#part-6--production-database-migrations)
- [Part 7 — Post-deploy checklist and known gaps](#part-7--post-deploy-checklist-and-known-gaps)
- [Part 8 — Troubleshooting](#part-8--troubleshooting)

---

## System overview

```
browser → gateway (:4000) → identity-svc (:4001)
                           → catalog-svc (:4002)      + catalog-ai-worker
                           → assessment-svc (:4003)   + assessment-worker
                           → analytics-svc (:4004)    + analytics-rollup-consumer + analytics-export-worker
                           → notification-svc (:4005) + notification-worker

apps/web (Next.js, :3000) → gateway (server-side only; every app/api/** route is a thin forward)

Postgres (:5433) -- one database, five schemas (identity/catalog/assessment/analytics/notification), five roles
Redis (:6380)
Redpanda (:19092 outside Docker, redpanda:9092 inside) + Redpanda Console (:8090)
MinIO (:9000 API, :9001 console) -- CSV export storage
```

Eleven deployable processes in total (gateway, 5 service APIs, 5 workers/consumers) plus the Next.js frontend. `infra/docker-compose.yml` runs all of it; see [Part 1](#part-1--local-development-with-docker-compose).

**Auth, unchanged by the split:** the opaque `${userId}-${timestamp}-${random}` token scheme lives entirely in identity-svc. The gateway calls identity-svc's `POST /v1/internal/introspect` once per request (Redis-cached ~2 min) and, on success, sets `x-user-id`/`x-user-name`/`x-user-email`/`x-user-is-admin` headers that every downstream service trusts — it strips any of those headers a caller sent itself first, so a request can't just claim to be an admin. No service other than the gateway and identity-svc ever sees or parses a raw token.

---

## Prerequisites

- **Node.js 22** and **pnpm** (`npm install -g pnpm@10.12.3` — the repo pins this exact version in every Dockerfile)
- **Docker Desktop** (WSL2 backend on Windows) — this is the only realistic way to run the full stack locally; running 11+ processes plus Postgres/Redis/Kafka/MinIO by hand is not a good use of your afternoon
- **A Google Gemini API key** (optional) — only needed for AI quiz/question generation; get one free at https://aistudio.google.com/apikey
- **Ports 5433, 6380, 19092, 8082, 8090, 9000, 9001, 9644, 4000–4005, 3000** free on your host. 5433/6380 (not 5432/6379) are deliberate — this avoids colliding with a locally-installed Postgres/Redis you might already have running as a system service.

---

## Part 1 — Local development with Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-repo
pnpm install
```

### 2. Optional secrets

Create `infra/.env` (Compose's project directory is wherever the compose file lives, so this is where it looks for a `.env` — **not** the repo root) if you want AI generation or push notifications to actually work:

```bash
GEMINI_API_KEY=your-key-here
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=you@example.com
```

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Skipping this file is fine — those two features degrade to an explicit error/no-op rather than crashing anything else.

### 3. Bring the stack up

```bash
pnpm compose:up
```

First run pulls/builds every image (11 Dockerfiles) and can take several minutes. Watch it with:

```bash
pnpm compose:logs
```

Every service defines a Docker healthcheck (`/healthz`) and `depends_on: condition: service_healthy`, so Compose won't start a service before its Postgres/Redpanda/Redis dependencies are actually ready — no manual "wait and retry" needed.

### 4. Run database migrations, per service

Each service owns its own Prisma schema and migration history (schema-per-service — see ARCHITECTURE.md's "Data ownership"). Apply all five:

```bash
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec catalog-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec assessment-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec analytics-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec notification-svc pnpm db:migrate
```

(`db:migrate` is `prisma migrate deploy` in every service's `package.json` — idempotent, safe to re-run.)

### 5. Seed sample data

```bash
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:seed
```

Creates the same two accounts the monolith used to:
- Admin: `admin@quizapp.com` / `admin123`
- Student: `student@test.com` / `student123`

catalog-svc has its own seed for a sample quiz:

```bash
docker compose -f infra/docker-compose.yml exec catalog-svc pnpm db:seed
```

### 6. Run apps/web

`apps/web` isn't in `docker-compose.yml`'s critical path for iterating on it — for a first look at the whole system, add it to the compose run:

```bash
docker compose -f infra/docker-compose.yml up -d --build web
```

Or run it outside Docker against the Dockerized backend (faster iteration on frontend changes, no image rebuild per edit):

```bash
GATEWAY_URL=http://localhost:4000 pnpm --filter web dev
```

Open http://localhost:3000 and log in with either seeded account.

### 7. Useful side views

- **Redpanda Console** (http://localhost:8090) — browse topics, watch consumer group lag, inspect a message's envelope. The single most useful tool for seeing the event-driven parts actually working.
- **MinIO Console** (http://localhost:9001, `minioadmin`/`minioadmin`) — see exported CSVs land in the `quiz-exports` bucket after triggering an export.

### 8. Tear down

```bash
pnpm compose:down
```

Add `-v` (`docker compose -f infra/docker-compose.yml down -v`) to also drop the Postgres/Redpanda/MinIO volumes — do this if you want a truly clean slate, e.g. after changing a migration.

---

## Part 2 — Running one service outside Docker

Useful when you're actively developing a single service and want `tsx watch`'s fast reload instead of a container rebuild loop. Run the *rest* of the stack in Docker, point the one service you're working on at those containers' host-exposed ports:

```bash
# infra still running via `pnpm compose:up` for everything else
cd apps/assessment
DATABASE_URL="postgresql://assessment_rw:assessment_rw_pw@localhost:5433/quiz?schema=assessment" \
KAFKA_BROKERS=localhost:19092 \
CATALOG_SVC_URL=http://localhost:4002 \
pnpm dev
```

Every service's own `package.json` documents its required env vars implicitly through what it reads from `process.env` in `src/index.ts` — cross-reference [Part 5](#part-5--environment-variables-reference) below. Stop the Dockerized copy of whichever service you're running locally first (`docker compose -f infra/docker-compose.yml stop assessment-svc`) so you're not fighting over the same port.

---

## Part 3 — Tests

```bash
pnpm typecheck   # tsc --noEmit across all 11 workspace packages via turbo
pnpm lint        # per-package lint (most services don't have one configured yet -- see known gaps)
pnpm test        # vitest, per package that defines a `test` script
```

The scoring golden-fixture suite (26 cases covering the exact quiz-scoring formula, including negative marking and the totalScore-floors-at-0 behavior) lives at `apps/assessment/tests/scoring.test.ts` now — it moved there from the monolith's `tests/unit/` alongside `lib/scoring.ts`'s move into `apps/assessment/src/lib/scoring.ts`, since assessment-svc is the one place that formula actually executes now (`POST /v1/attempts/:id/submit`).

E2E (Playwright) specs live in `apps/web/tests-e2e/` and need a real backend running (`pnpm compose:up` first, then `pnpm --filter web test:e2e`) — they haven't been re-pointed at the gateway-backed flow yet; see [known gaps](#part-7--post-deploy-checklist-and-known-gaps).

---

## Part 4 — Hosting online

There's no single "click Deploy" answer here the way there was for the old single-Next.js-app version — you're now hosting 11 backend processes plus a frontend, plus Postgres/Redis/Kafka/object storage. **Free** hosting specifically has one hard constraint that shapes everything below: none of these 11 processes are purely request/response. Every one of the 5 API services also runs a background outbox-publish loop (`setInterval`) alongside its HTTP server; 5 more are dedicated Kafka consumers/workers with no inbound HTTP traffic at all; notification-svc additionally holds long-lived SSE connections open. Almost every "free" PaaS tier (Render, Railway, Fly.io) is built around request-driven web services that sleep when idle — and freezing any of the above mid-cycle either drops an in-flight Kafka message or silently stops publishing an already-committed outbox row. There's no clean way to make that combination free on those platforms.

The one genuinely-free option that sidesteps this entirely: an **always-on free VM**. Oracle Cloud's "Always Free" tier gives you a real, perpetually-free Ampere A1 (ARM) VM with up to 4 OCPUs and 24GB RAM — not a trial, not a credit that expires. That's enough headroom to just run `infra/docker-compose.yml` as-is, unmodified architecture, no consumer-sleeping problem, because nothing on the box goes idle-killed. This is genuinely just "Option A" from the original draft of this section, except the VM costs $0 forever instead of a monthly VPS bill.

### Oracle Cloud Free Tier walkthrough

**1. Create the account and the VM**

1. Sign up at https://www.oracle.com/cloud/free/ (a card is required for identity verification, but Always Free resources are never billed against it — watch for accidentally provisioning something outside the Always Free shape list, which *would* bill).
2. **Create a Compute Instance**: Compute → Instances → Create Instance.
   - **Shape**: `VM.Standard.A1.Flex` — set it to the full Always Free allowance, 4 OCPUs / 24GB RAM. This is the one instance running the whole stack; there's no reason to split it across multiple smaller Always-Free VMs for this project.
   - **Image**: Ubuntu 22.04 or newer (the Ubuntu images Oracle offers for this shape are the least friction for a standard Docker install).
   - **Boot volume**: default (~50GB) is fine and still inside the Always Free allowance.
   - Leave networking on the auto-created VCN/subnet unless you already have one you prefer.
3. **A real technical caveat, stated plainly rather than assumed away**: the A1 shape is ARM64 (`aarch64`), not x86_64. Every image this stack uses (`node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`, `caddy:2-alpine`, `minio/minio`, `minio/mc`, and the two Redpanda images) needs to actually publish an `arm64` variant for `docker compose build` to work unmodified. Node/Postgres/Redis/Caddy/MinIO all do. **Verify the Redpanda images specifically before committing time to this** (`docker manifest inspect redpandadata/redpanda:v24.2.18` from the VM, after installing Docker in step 4 below, will show you every platform it publishes) — Redpanda's ARM support has existed for a while but pin-checking the exact tag this repo uses is worth 30 seconds before you're debugging a "no matching manifest" error instead. If it turns out that one specific tag lacks an arm64 build, bump `redpanda`/`redpanda-console`'s image tags in `infra/docker-compose.yml` to a version that publishes one — everything else in the stack (all 12 Dockerfiles you own) builds from source on whatever architecture Docker runs on, so they're not a concern either way.

**2. Open the firewall — both layers**

Oracle Cloud has two independent firewalls, and people miss the second one constantly:
- **Cloud-level (Security List / Network Security Group)**: Networking → Virtual Cloud Networks → your VCN → Security Lists → add Ingress Rules for TCP 80 and 443 from `0.0.0.0/0`. Port 22 (SSH) is usually already open from instance creation.
- **OS-level (`iptables`/`netfilter`)**: Oracle's Ubuntu images ship a permissive default, but confirm once you're on the box: `sudo iptables -L -n` (or `sudo ufw status` if ufw is active). If 80/443 aren't allowed at the OS level, add them (`sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT`, same for 443, then persist with `sudo netfilter-persistent save` or your distro's equivalent) — don't skip this and assume the cloud firewall alone is enough; it isn't.

Deliberately **do not** open 5433/6380/19092/8082/8090/9000/9001/9644/4000–4005 at the cloud level. `docker-compose.prod.yml` (step 5) already rebinds every one of those to `127.0.0.1` as defense in depth, but the cloud firewall staying closed on them is the actual control.

**3. Point a domain at it**

Add an `A` record for your domain (or a subdomain) to the VM's public IP. Caddy's automatic HTTPS (step 5) needs this resolvable *before* it can request a certificate — DNS propagation can take a few minutes.

**4. Install Docker**

```bash
ssh ubuntu@<vm-public-ip>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable --now docker   # survives a reboot
```

No Node/pnpm install needed on the VM itself — every service builds its own dependencies inside its Dockerfile's build stage.

**5. Clone, configure, deploy**

```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-repo/infra
cp .env.example .env
nano .env   # fill in real values for every password field -- see .env.example's comment
            # on generating them; do not deploy with the dev defaults
```

Edit `infra/Caddyfile`, replacing `DOMAIN_PLACEHOLDER` with your real domain from step 3.

```bash
cd ..   # back to repo root
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
```

First build compiles all 12 owned Dockerfiles from source on a 4-core ARM box — expect it to take a while (10–20 minutes is normal for a first build; subsequent deploys are much faster since most layers cache).

**6. Migrate, seed, verify**

Same as [Part 1 steps 4–5](#4-run-database-migrations-per-service), just prefix each `docker compose` call with both `-f` flags to match how you brought the stack up:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml exec identity-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml exec identity-svc pnpm db:seed
# ...repeat db:migrate for catalog-svc, assessment-svc, analytics-svc, notification-svc
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml exec catalog-svc pnpm db:seed
```

Visit `https://your-domain.com` — Caddy's first request to a fresh domain takes a couple of extra seconds while it completes the ACME challenge and gets a certificate; after that it's cached.

**7. Backups**

There's no managed-Postgres PITR safety net here the way Neon would give you — back up the volume yourself. A daily cron calling `pg_dump` into a file outside the Docker volume (and ideally copied off the VM — Oracle's Object Storage also has an Always Free allowance, 10GB, plenty for compressed SQL dumps) is the minimum bar:

```bash
# /etc/cron.daily/quiz-db-backup (chmod +x)
#!/bin/bash
set -a; source /home/ubuntu/quiz-repo/infra/.env; set +a
docker compose -f /home/ubuntu/quiz-repo/infra/docker-compose.yml exec -T \
  -e PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-quiz_admin_pw}" postgres \
  pg_dump -U quiz_admin quiz | gzip > /home/ubuntu/backups/quiz-$(date +%F).sql.gz
find /home/ubuntu/backups -mtime +14 -delete
```

**8. Ongoing operations**

- `restart: unless-stopped` on every service (already set in `docker-compose.yml`) means a VM reboot brings the whole stack back up on its own, as long as `systemctl enable docker` (step 4) was run.
- Docker's default logging driver doesn't rotate on its own and *will* eventually fill the disk on a long-lived box. Add to `/etc/docker/daemon.json`:
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
  ```
  then `sudo systemctl restart docker` (this only affects new containers, so `docker compose ... up -d --force-recreate` once after changing it).
- `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f <service>` for live logs; Redpanda Console stays reachable only via SSH tunnel now (`ssh -L 8090:localhost:8090 ubuntu@<vm-ip>`), same for the other now-localhost-only ports.

### If you outgrow the free tier, or want managed infra instead

Everything above is one option, not the only one. If the free VM stops being enough (real sustained traffic, wanting managed Postgres backups, per-service independent scaling), the same 11 processes map cleanly onto Railway/Render/Fly.io (each becomes its own service, pointed at its own Dockerfile) plus managed Postgres + Upstash Redis + Upstash Kafka/Redpanda Cloud + real S3 — the code doesn't change either way, only where each container runs and which env vars point at which managed endpoint. `apps/web` specifically can also always move to Vercel independently of wherever the backend lives, since it's stateless (every `app/api/**` route is a thin forward to the gateway) — just point its `GATEWAY_URL` at wherever the gateway ends up publicly reachable.

---

## Part 5 — Environment variables reference

This table is what each service reads from `process.env` directly. It's a different, smaller list than `infra/.env.example`'s — that file covers the Postgres role passwords and MinIO credentials Docker Compose substitutes *into* the `DATABASE_URL`/`S3_*` values below before they ever reach a service; a service itself never reads e.g. `IDENTITY_RW_PASSWORD` directly, only the already-assembled `DATABASE_URL`.

| Service | Variable | Required | Notes |
|---|---|---|---|
| gateway | `PORT` | No (default 4000) | |
| gateway | `REDIS_URL` | Yes | token-introspection cache + rate limiting |
| gateway | `IDENTITY_SVC_URL`, `CATALOG_SVC_URL`, `ASSESSMENT_SVC_URL`, `ANALYTICS_SVC_URL`, `NOTIFICATION_SVC_URL` | Yes | upstream targets for the proxy routing table |
| identity-svc | `PORT` | No (default 4001) | |
| identity-svc | `DATABASE_URL` | Yes | must connect as the `identity_rw` role, schema `identity` |
| identity-svc | `KAFKA_BROKERS` | Yes | |
| catalog-svc (+ ai-worker) | `DATABASE_URL`, `KAFKA_BROKERS` | Yes | role `catalog_rw`, schema `catalog` |
| catalog-svc (+ ai-worker) | `GEMINI_API_KEY` | No | AI quiz generation returns a `failed` job status without it, doesn't crash |
| assessment-svc (+ worker) | `DATABASE_URL`, `KAFKA_BROKERS` | Yes | role `assessment_rw`, schema `assessment` |
| assessment-svc (+ worker) | `CATALOG_SVC_URL`, `IDENTITY_SVC_URL` | Yes | internal calls: quiz snapshot at attempt-start, and the legacy admin/analytics reporting routes' cross-service enrichment |
| assessment-worker | `SWEEP_INTERVAL_MS`, `SWEEP_BATCH_SIZE` | No | expiry-sweeper tuning, defaults 15000 / 100 |
| analytics-svc (+ rollup-consumer + export-worker) | `DATABASE_URL`, `KAFKA_BROKERS`, `REDIS_URL` | Yes | role `analytics_rw`, schema `analytics` |
| analytics-svc (+ export-worker) | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `EXPORT_BUCKET` | Yes (for exports) | MinIO locally; real S3 in prod (omit `S3_ENDPOINT` to use AWS's default) |
| notification-svc (+ worker) | `DATABASE_URL`, `KAFKA_BROKERS`, `REDIS_URL` | Yes | role `notification_rw`, schema `notification` |
| notification-svc (+ worker) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | No | push notifications no-op with a logged warning without these |
| apps/web | `GATEWAY_URL` | Yes | server-side only, read at request time by every `app/api/**` route handler |
| apps/web | `GEMINI_API_KEY` | No | used directly by the two AI routes apps/web still owns (`api/ai/generate-questions`, `api/generate-flashcards`) — see [known gaps](#part-7--post-deploy-checklist-and-known-gaps) for why those weren't moved into catalog-svc |

`KAFKA_BROKERS` defaults to `localhost:19092` everywhere if unset (useful for Part 2's "run one service outside Docker" flow); inside Docker Compose it's always explicitly `redpanda:9092`. `REDIS_URL` defaults to `redis://localhost:6380`.

---

## Part 6 — Production database migrations

- Same rule as before: **`prisma migrate deploy`, never `migrate dev`**, against anything with real data — this now applies per-service (five independent migration histories, five independent `_prisma_migrations` tables in their own schemas).
- Order doesn't matter across services (no cross-schema foreign keys exist, by design), but running identity-svc and catalog-svc first is sensible since assessment-svc's snapshot-on-attempt-start assumes a quiz already exists to snapshot.
- Each service's migration only ever touches its own schema — `identity_rw` physically cannot see `catalog`'s tables, so there's no risk of one service's migration accidentally touching another's data even if run out of order or concurrently.
- Back up the whole Postgres instance before any migration that drops/alters a column, same as before — it's one physical database even though it's five logical schemas, so a restore is still all-or-nothing at the instance level.

---

## Part 7 — Post-deploy checklist and known gaps

Carried forward from the monolith, still true:
1. Passwords are stored and compared in plaintext (`identity-svc`'s login route) — an explicit, documented decision for this pass (see ARCHITECTURE.md Phase 2 for the deferred hardening plan), not an oversight. Treat it accordingly if this goes anywhere near real user data.
2. `app/goals/page.tsx`'s goal history is still `localStorage`-only, not server-persisted.

New to the split architecture:
3. **catalog-svc's AI quiz generation doesn't carry `chapterId`/`duration`/`negativeMarking` through to the generated quiz** — the async job (`AiGenerationJob`) only stores `title`/`sections`/`difficulty`/`questionsPerSection`; the resulting quiz lands with defaults and no chapter assignment. Fixing this needs a small schema addition to `AiGenerationJob`, not just a route change. Flagged in `apps/web/app/api/ai/generate-quiz/route.ts`'s own comment.
4. **The legacy (pre-`Attempt`) `QuizResult`-based reporting routes** (`/api/analytics`, `/api/admin/analytics`, `/api/admin/results`, `/api/admin/users`, `/api/admin/user-performance`) now live in `apps/assessment/src/legacy.ts`, doing cross-service enrichment via two new internal endpoints (`catalog-svc`'s `GET /internal/quizzes-meta`, `identity-svc`'s `GET /v1/internal/users`) instead of the single Prisma include chain they used to be. These are read-mostly, admin/self reporting views over data that predates this service split — new scores never write here (that goes through the `Attempt` flow via `POST /v1/attempts/:id/submit`). They work, but haven't been re-pointed at `analytics-svc`'s proper read models (`AttemptFact`/`UserStats`/`QuizStats`, fed by the new event-driven pipeline) — that's the natural next step, not done in this pass.
5. **No OpenTelemetry/Prometheus/Grafana wiring**, despite `ARCHITECTURE.md` describing it as part of the observability story. Every service propagates an `x-trace-id` header end-to-end (see `packages/observability`) and logs structurally via pino, but there's no actual span export or metrics scraping. Deliberately not scaffolded with decorative, non-functional containers — see the same file's comments.
6. **`ai/generate-questions` and `generate-flashcards`** (both in `apps/web`) still call Gemini directly rather than going through catalog-svc — they persist nothing, so there's no compelling reason to route them through the service split; they're a deliberate scope boundary, not a leftover.
7. **Every backend service runs via `tsx` directly**, no compiled `dist/` build step, in both dev and "production" Docker images. An explicit, documented simplicity trade-off for this pass — see each Dockerfile's own comment.
8. **Playwright E2E specs haven't been re-pointed at the gateway-backed flow** (see [Part 3](#part-3--tests)) — they still assume the pre-split routes.

---

## Part 8 — Troubleshooting

**A service's healthcheck never goes healthy / `depends_on` hangs forever**
- `docker compose -f infra/docker-compose.yml logs <service-name>` — almost always a missing migration (the service can't reach its schema yet) or a wrong `DATABASE_URL`/role password. Compare against `infra/postgres/init/01-schemas-roles.sql`.

**Port already in use (5433, 6380, 19092, etc.)**
- Another `docker compose up` from a previous run may still be up (`docker compose -f infra/docker-compose.yml ps` across all your projects), or you have a local Postgres/Redis running on a port that happens to collide despite the offset. `docker ps` to find the real culprit.

**Redpanda container unhealthy / `rpk cluster health` never reports healthy**
- Give it more time on first boot (creating the initial topics takes a few seconds) before assuming it's broken. If it's genuinely stuck, `docker compose -f infra/docker-compose.yml logs redpanda` — a common cause on constrained hosts is insufficient memory (`--memory=512M` in the compose command is already fairly tight; raise it if your host has room).

**A Kafka consumer seems to have stopped processing / a job runs twice**
- Check `max.poll.interval.ms` if you've changed a handler to do more work per message — `catalog-ai-worker` and `analytics-export-worker` both raise this explicitly (15 min) because their handlers are long-running; a consumer that pauses longer than its poll interval gets evicted from its group and rebalanced, which can double-process the in-flight message. See each worker's own comment for the specific tuning.

**`docker compose exec <service> pnpm db:migrate` fails with "role does not exist"**
- `infra/postgres/init/*.sql` only runs on a **fresh** `postgres-data` volume (Postgres only executes `docker-entrypoint-initdb.d` scripts the very first time a volume is initialized). If you've already brought Postgres up once without it, `docker compose -f infra/docker-compose.yml down -v` to wipe the volume and let it re-run, or apply the SQL manually with `docker compose exec postgres psql -U quiz_admin -d quiz -f /docker-entrypoint-initdb.d/01-schemas-roles.sql`.

**`pnpm install --frozen-lockfile` fails / lockfile out of date**
- Someone edited a `package.json` without regenerating `pnpm-lock.yaml`. Run `pnpm install` (without `--frozen-lockfile`), commit the updated lockfile.

**Build fails with a Next.js 15 "params should be awaited" type error**
- Any route handler/page still using the old `{ params }: { params: { id: string } }` signature needs the Next 15 async form: `props: { params: Promise<{ id: string }> }` + `const { id } = await props.params`. Codemod: `npx @next/codemod@canary next-async-request-api .`
