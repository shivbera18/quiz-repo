# CLAUDE.md — quiz-platform engineering reference

> **What this file is.** The single entry point for any agent or developer working in this
> repository. It answers three questions for every task: **what exists**, **where it lives**,
> and **which document/skill to read before touching it**.
>
> **How to use it.** Read §0–§4 always (they are short). Then jump to the section for your
> task via §21 *Task routing cheat-sheet*. Never guess a path — every path in this file was
> verified against the working tree.
>
> **Source of truth policy.** This file is a *map*, not a replacement for the deep docs.
> Where this file and a deep doc disagree, the deep doc wins for *rationale*; **the code wins
> for behaviour**. Where a doc describes something that does not exist, this file says so
> explicitly (see §19 *Doc-vs-code discrepancies*).

---

## Contents

| § | Section | Read it when |
|---|---|---|
| 0 | [Project identity](#0--project-identity) | first contact |
| 1 | [Quick commands](#1--quick-commands) | every session |
| 2 | [Documentation map — what to read for what](#2--documentation-map--what-to-read-for-what) | before any non-trivial change |
| 3 | [Skills index — `.claude/skills/`](#3--skills-index--claudeskills) | before any non-trivial change |
| 4 | [Architecture at a glance](#4--architecture-at-a-glance) | always |
| 5 | [Repository layout](#5--repository-layout) | finding anything |
| 6 | [`apps/web` — Next.js frontend](#6--appsweb--nextjs-frontend) | UI or `app/api/**` work |
| 7 | [`apps/gateway` — API gateway](#7--appsgateway--api-gateway) | routing, auth, rate limits |
| 8 | [`apps/identity` — identity-svc](#8--appsidentity--identity-svc-4001) | auth, users, tokens |
| 9 | [`apps/catalog` — catalog-svc](#9--appscatalog--catalog-svc-4002) | subjects/chapters/quizzes/question bank/AI |
| 10 | [`apps/assessment` — assessment-svc](#10--appsassessment--assessment-svc-4003) | attempts, scoring, legacy reporting |
| 11 | [`apps/analytics` — analytics-svc](#11--appsanalytics--analytics-svc-4004) | rollups, leaderboards, CSV export |
| 12 | [`apps/notification` — notification-svc](#12--appsnotification--notification-svc-4005) | announcements, SSE, push |
| 13 | [`packages/*` — shared libraries](#13--packages--shared-libraries) | contracts, kafka, redis, logging |
| 14 | [Data layer — Postgres, schemas, roles, Prisma](#14--data-layer--postgres-schemas-roles-prisma) | any schema change |
| 15 | [Kafka / Redpanda — topics, envelope, outbox, idempotency](#15--kafka--redpanda--topics-envelope-outbox-idempotency) | any event change |
| 16 | [Redis — keys, rate limits, leaderboards, SSE](#16--redis--keys-rate-limits-leaderboards-sse) | caching, limits, realtime |
| 17 | [End-to-end request traces](#17--end-to-end-request-traces) | understanding a flow |
| 18 | [Environment variables — complete reference](#18--environment-variables--complete-reference) | config, deploy, debugging |
| 19 | [Invariants, known gaps, footguns, doc-vs-code discrepancies](#19--invariants-known-gaps-footguns-doc-vs-code-discrepancies) | **before writing code** |
| 20 | [Testing, CI, and deployment](#20--testing-ci-and-deployment) | verifying / shipping |
| 21 | [Task routing cheat-sheet](#21--task-routing-cheat-sheet) | starting any task |
| 22 | [Conventions and house rules](#22--conventions-and-house-rules) | writing code |
| 23 | [Glossary](#23--glossary) | unfamiliar term |

---

## 0 — Project identity

| Fact | Value |
|---|---|
| Name | `quiz-platform` (root `package.json`), repo `quiz-repo` |
| What it is | AI-assisted quiz/exam platform: admins author quizzes, students take timed attempts, server scores them, analytics/leaderboards/notifications are event-driven |
| Shape | Turborepo + pnpm monorepo → **1 Next.js frontend + 1 Fastify gateway + 5 Fastify services + 5 workers = 12 processes** (11 backend + web) |
| Package manager | **pnpm 10.12.3** — pinned in root `packageManager` and in every Dockerfile. Never use npm/yarn |
| Node | **22** |
| Workspaces | `apps/*`, `packages/*` → **11 workspace packages** (7 apps + 4 packages) |
| Language | TypeScript everywhere, `strict: true` via `tsconfig.base.json`, ESM (`"type": "module"`) in all backend apps + packages |
| Backend runtime | **`tsx` directly — there is no compiled `dist/` for any service**, in dev *and* in Docker "production" images (deliberate; see §19) |
| Git | branch `main`; remotes `origin`/`upstream` → `github.com/shivbera18/quiz-repo`, `neo` → `quiz-neobrutalism-version` |
| Deploy | backend → EC2/VPS via `docker compose` + GitHub Actions SSH; frontend → Vercel (`apps/web` as Root Directory) |
| Seeded accounts | `admin@quizapp.com` / `admin123` · `student@test.com` / `student123` |

**The one-sentence mental model:** the browser only ever talks to `apps/web`; `apps/web` route
handlers only ever talk to the gateway; the gateway is the only thing that authenticates; every
service owns its own Postgres schema and talks to other services **only** through Kafka events
plus two narrow internal HTTP endpoints.

---

## 1 — Quick commands

All from the repo root unless stated. Root scripts are in `package.json`.

```bash
pnpm install                       # always --frozen-lockfile in CI
pnpm db:generate                   # turbo run prisma:generate — REQUIRED before first typecheck/run
pnpm typecheck                     # tsc --noEmit across all 11 packages
pnpm lint                          # web: eslint; backend apps: echo stub (see §19)
pnpm test                          # vitest — currently only apps/assessment/tests/scoring.test.ts
pnpm build                         # turbo run build — effectively only apps/web
```

Docker stack (`infra/docker-compose.yml`, compose project name **`quiz-platform`**):

```bash
pnpm compose:up                    # up -d --build (all infra + 11 backend processes + web)
pnpm compose:logs                  # logs -f
pnpm compose:down                  # down          (add -v to also drop volumes)
pnpm compose:prod:up               # + infra/docker-compose.prod.yml (Caddy, no host port bindings)
```

Per-service migrations and seeds (run **inside** the container):

```bash
docker compose -f infra/docker-compose.yml exec identity-svc     pnpm db:migrate
docker compose -f infra/docker-compose.yml exec catalog-svc      pnpm db:migrate
docker compose -f infra/docker-compose.yml exec assessment-svc   pnpm db:migrate
docker compose -f infra/docker-compose.yml exec analytics-svc    pnpm db:migrate
docker compose -f infra/docker-compose.yml exec notification-svc pnpm db:migrate

docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:seed   # 2 accounts
docker compose -f infra/docker-compose.yml exec catalog-svc  pnpm db:seed   # 1 sample quiz
```

Frontend against the Dockerized backend (fastest UI loop — no image rebuild per edit):

```bash
GATEWAY_URL=http://localhost:4000 pnpm --filter web dev      # http://localhost:3000
```

One backend service outside Docker (fast reload; stop the containerised copy first):

```bash
docker compose -f infra/docker-compose.yml stop assessment-svc
cd apps/assessment
DATABASE_URL="postgresql://assessment_rw:assessment_rw_pw@localhost:5433/quiz?schema=assessment" \
KAFKA_BROKERS=localhost:19092 CATALOG_SVC_URL=http://localhost:4002 \
IDENTITY_SVC_URL=http://localhost:4001 pnpm dev
```

Side consoles: **Redpanda Console** http://localhost:8090 (topics, consumer lag, message
envelopes — the best tool for verifying event flow) · **MinIO Console** http://localhost:9001
(`minioadmin`/`minioadmin`, bucket `quiz-exports`).

Filter syntax reminder — pnpm filters use the **package name**, not the directory:
`web`, `gateway`, `identity-svc`, `catalog-svc`, `assessment-svc`, `analytics-svc`,
`notification-svc`, `@quiz/contracts`, `@quiz/kafka-kit`, `@quiz/redis-kit`,
`@quiz/observability`.

---

## 2 — Documentation map — what to read for what

Nine markdown documents exist. **Read the right one instead of re-deriving it from code.**

| Document | Size / scope | Read it for | Do **not** use it for |
|---|---|---|---|
| `README.md` | 127 lines · orientation | Feature list, tech-stack table, 6-line quick start, project-structure sketch, default accounts | Any operational detail — it defers to the others |
| `ARCHITECTURE.md` | **616 lines · the design bible** | *Why* every boundary, topic key, retention, Redis key, index, and rejected alternative exists. The `Attempt` model rationale. The "Where this design is wrong" section (§"Where this design is wrong, and why it's here anyway") is the most valuable part of the repo | A description of current code — it is a **migration plan** written against the pre-split monolith; Phases 0–10, RS256 JWT, argon2id, `auth-kit`, OTel, DLQ, `pg-boss` are **plans, not code** (§19) |
| `CODE_STRUCTURE.md` | 72 lines · directory tour | A fast prose walkthrough of `apps/`, `packages/`, `infra/` and what each file is for | Exhaustive file lists — that is §5–§13 of this file |
| `TECH_STACK.md` | 37 lines · dependency rationale | Which library is used at which layer and why (Fastify, Prisma, Zod, Redpanda, Turborepo, Vitest/Playwright, Pino) | Version numbers (drifts) and OpenTelemetry (aspirational) |
| `HOSTING.md` | **275 lines · the operational reference** | System overview with ports, local Compose workflow (Parts 1–2), tests (Part 3), hosting options (Part 4), **complete env-var table (Part 5)**, migration rules (Part 6), **known gaps (Part 7)**, **troubleshooting (Part 8)** | Step-by-step VPS provisioning — that is `ORACLE_SETUP.md` |
| `DEPLOYMENT.md` | 181 lines · deploy checklist | The EC2/Oracle-VPS-backend + Vercel-frontend topology diagram, GitHub secrets to set, Vercel project settings (`Root Directory: apps/web`, `GATEWAY_URL`), what happens on every push, deploy troubleshooting | The workflow filename — it says `deploy-oracle.yml`; the real file is `.github/workflows/deploy-ec2.yml` (§19) |
| `ORACLE_SETUP.md` | 21 KB · 16 numbered steps | One-time VM provisioning: account, ARM64 shape check, **both firewall layers** (Security List + firewalld), DNS, Docker install, clone, secrets, first deploy, migrate/seed, verify, backups, log rotation, ops cheat-sheet, troubleshooting | Anything about CI or Vercel |
| `docs/push-notifications-implementation.md` | 109 lines | The 6-step design of the web-push feature, VAPID setup, browser support matrix | Current paths — it predates the split (`npx prisma`, monolith `lib/`); **it hardcodes a real VAPID key pair** (§19) |
| `docs/next-steps-push-notifications.md` | 269 lines | Manual QA walkthrough for push, priority-level behaviour, content guidelines, browser-settings troubleshooting | Same caveat — pre-split paths, **contains a second committed VAPID key pair** |

Not markdown, but authoritative and worth reading directly — these files carry long
explanatory header comments that are effectively documentation:

| File | Why read it |
|---|---|
| `infra/docker-compose.yml` | 448 lines; header explains port offsets (5433/6380), per-service dev credentials, why observability containers are absent |
| `infra/postgres/init/01-schemas-roles.sh` | The actual schema/role/grant contract; explains why it is `.sh` not `.sql` |
| `packages/redis-kit/src/keys.ts` | Every Redis key in the system, with rationale per key |
| `packages/contracts/src/events/topics.ts` | Every Kafka topic + payload shape, with keying rationale |
| `packages/kafka-kit/src/outbox.ts` | Why `withClaimedBatch` is one method (claim + mark must share a transaction) |
| `apps/catalog/src/ai-worker.ts` | Self-documenting honesty notes about Kafka-vs-queue and the `hasProcessed` stub |
| `apps/assessment/src/attempt-service.ts` | The attempt state machine, CAS submit, snapshot dedupe |
| `apps/analytics/src/rollup-consumer.ts` | The projection/idempotency pattern in its strictest form |
| `.env.example` (root) | Explains that only `apps/web` + local tooling read root env; Compose reads `infra/.env` |
| `infra/.env.example` | The 12 override vars (5 role passwords, admin password, 2 MinIO, Gemini, 3 VAPID) |

---

## 3 — Skills index — `.claude/skills/`

**18 project skills** live in `.claude/skills/<name>/SKILL.md`. They are loaded by the `pi`
tooling via `.pi/settings.json` (`"skills": ["../.claude/skills"]`, `enableSkillCommands: true`),
which additionally pulls three upstream skills from `github.com/anthropics/skills`
(`frontend-design`, `skill-creator`, `webapp-testing`).

**Load the matching skill before starting work — it contains the step order, the invariants to
preserve, and the verification steps for that area.**

| Skill | Load it when you are… |
|---|---|
| `authentication-and-sessions` | touching signup/login/tokens/introspection/roles/gateway auth cache/logout/password storage/session expiry |
| `gateway-route-and-rate-limit` | adding a proxy prefix, a public-route rule, header propagation, CORS, trace IDs, or a Redis rate-limit policy |
| `microservice-api-change` | adding/changing any Fastify endpoint or service logic in any backend app |
| `contracts-and-events` | changing a shared Zod DTO, a Kafka event/topic, a producer/consumer, or outbox behaviour — i.e. **anything crossing a service boundary** |
| `prisma-database-change` | changing a model, index, constraint, migration, seed, or query in one service |
| `quiz-attempt-lifecycle` | start/resume/autosave/expire/submit/score/display of attempts; timers; duplicate submits; snapshots |
| `quiz-content-management` | subjects/chapters/quizzes/question-bank CRUD, admin editors, imports, activation, catalog change events |
| `ai-quiz-generation` | Gemini async generation, job status, partial results, prompt validation, retries, dedupe, admin review |
| `analytics-rollups` | projections, attempt facts, quiz/user stats, streaks, cache invalidation, event-driven rollups |
| `leaderboard-consistency` | leaderboard ranking, Redis sorted sets, ties, updates, consistency with analytics facts |
| `csv-export-pipeline` | async CSV exports, filters, pagination, formula escaping, MinIO upload, job status, download expiry, memory behaviour |
| `notifications-realtime-push` | announcements, SSE streaming, stream tickets, push subscriptions, service-worker delivery, fanout, dedupe |
| `pwa-service-worker` | manifest, SW registration/caching/offline/update rollout, installability, icons, push handlers |
| `frontend-feature` | any `apps/web` page, component, form, client state, styling, a11y, gateway call |
| `distributed-debugging` | a bug spanning web → gateway → service → Postgres/Redis/Kafka/MinIO/worker/SSE/push |
| `security-review` | reviewing/hardening auth, authz, input handling, quiz integrity, API exposure, secrets, uploads, limits, deps, deploy |
| `testing-and-quality` | writing/repairing/running unit, integration, or Playwright tests; flaky tests; pre-merge verification |
| `infrastructure-and-deployment` | Docker/Compose, env config, GitHub Actions, Caddy, healthchecks, local stack startup, production deploy |

Also present: `.claude/settings.local.json` — local permission allowlist (`Bash(pnpm -v)`,
`Bash(npm -v)`); it is gitignored (`.gitignore` has `.claude/settings.local.json`, so the
`skills/` tree **is** tracked while local settings are not).

---

## 4 — Architecture at a glance

```
                    browser
                       │  (HTTPS — the ONLY thing a browser talks to)
                       ▼
        ┌──────────────────────────────┐
        │ apps/web  (Next.js 15, :3000)│  UI + app/api/** thin forwarders
        │  lib/gateway-client.ts       │  proxyToGateway() — the single egress point
        └──────────────┬───────────────┘
                       │ server-side fetch, GATEWAY_URL
                       ▼
        ┌──────────────────────────────┐
        │ apps/gateway (Fastify, :4000)│  AUTH TERMINATES HERE (once)
        │  introspect → Redis 120s     │  rate limit · strip+set x-user-* · trace-id
        └──┬────────┬────────┬─────┬───┴────┐
           ▼        ▼        ▼     ▼        ▼
     identity  catalog  assessment  analytics  notification
       :4001    :4002      :4003      :4004       :4005
         │      +ai-       +worker    +rollup-    +fanout-
         │      worker     (sweeper)  consumer     worker
         │                            +export-
         │                             worker
         └────────┬─────────┬───────────┬──────────┘
                  ▼         ▼           ▼          ▼
              Postgres    Redis     Redpanda     MinIO
              1 db `quiz` cache/     (Kafka API) quiz-exports
              5 schemas   limits/    13 topics   bucket
              5 roles     lb/SSE
```

### Processes, ports, package names

| Directory | package name | Port | Processes | Owns (Postgres schema) |
|---|---|---|---|---|
| `apps/web` | `web` | 3000 (3100 in e2e cfg) | 1 Next server | — (no DB, no Prisma) |
| `apps/gateway` | `gateway` | 4000 | 1 | — (no DB, no Prisma, no Kafka) |
| `apps/identity` | `identity-svc` | 4001 | 1 (outbox publisher **in-process**) | `identity` |
| `apps/catalog` | `catalog-svc` | 4002 | 2 — api + `catalog-ai-worker` | `catalog` |
| `apps/assessment` | `assessment-svc` | 4003 | 2 — api + `assessment-worker` (outbox + expiry sweeper) | `assessment` |
| `apps/analytics` | `analytics-svc` | 4004 | 3 — api + `analytics-rollup-consumer` + `analytics-export-worker` | `analytics` |
| `apps/notification` | `notification-svc` | 4005 | 2 — api + `notification-worker` (fanout) | `notification` |

### Infrastructure ports (host → container)

| Component | Image | Host port(s) | In-cluster address | Container name |
|---|---|---|---|---|
| Postgres | `postgres:16-alpine` | **5433** → 5432 | `postgres:5432` | `quiz-platform-postgres-1` |
| Redis | `redis:7-alpine` | **6380** → 6379 | `redis:6379` | `quiz-platform-redis-1` |
| Redpanda | `redpandadata/redpanda:v24.2.18` | **19092**, 8082, 9644 | `redpanda:9092` | `quiz-platform-redpanda-1` |
| Redpanda Console | `redpandadata/console:v2.7.2` | **8090** → 8080 | — | `quiz-platform-redpanda-console-1` |
| MinIO | `minio/minio:latest` | **9000** (API), **9001** (console) | `minio:9000` | `quiz-platform-minio-1` |
| MinIO init | `minio/mc:latest` | — | one-shot: creates `quiz-exports` | `quiz-platform-minio-init-1` |
| Caddy (prod overlay only) | `caddy:2-alpine` | 80, 443 | → `gateway:4000` | `quiz-platform-caddy-1` |

5433/6380 are deliberate offsets so a locally-installed Postgres/Redis (or Memurai on Windows)
does not collide. Nothing sets `container_name`; names are derived from `name: quiz-platform`.

### The three cross-service mechanisms (and there is no fourth)

1. **Immutable snapshot at the boundary.** `assessment-svc` calls `catalog-svc`
   `GET /internal/quizzes/:id/full` **exactly once**, at attempt start, and stores the result in
   `assessment.AttemptSnapshot` (deduped on `(quizId, contentHash)`). After that it never talks
   to catalog again for that attempt. This also fixes a correctness bug for free: an admin
   editing a quiz mid-exam cannot change questions or marking under a student.
2. **Event-carried state transfer.** `analytics.Dim*` and `notification.UserRef` are local
   projections fed by Kafka. Every query joins only tables the service owns.
3. **Deliberate historical denormalization.** `assessment.Attempt` freezes `userName`/`userEmail`
   at attempt time. `USER_CHANGED` events must **never** backfill attempts — a March result sheet
   shows the March name.

Exceptions (documented, narrow, internal-only, never gateway-exposed): `catalog-svc`
`GET /internal/quizzes-meta` and `identity-svc` `GET /v1/internal/users` + `GET /v1/users/:id`,
used by the **legacy** reporting routes in `apps/assessment/src/legacy.ts`, plus
`identity-svc` `POST /v1/internal/introspect` used by the gateway.

**No service calls another on a request-serving hot path.** If catalog is down, "start quiz"
returns a clean 503.

---

## 5 — Repository layout

```
quiz-repo/
├─ .claude/
│  ├─ CLAUDE.md                     ← THIS FILE
│  ├─ settings.local.json           (gitignored: local permission allowlist)
│  └─ skills/<18 dirs>/SKILL.md     (tracked; see §3)
├─ .github/workflows/
│  ├─ ci.yml                        CI: install → db:generate → typecheck → lint → test → web build
│  ├─ deploy-ec2.yml                SSH deploy of the 11 backend processes + migrate + seed
│  └─ db-backup.yml                 nightly pg_dumpall → artifact (+ optional Neon sync)
├─ .pi/settings.json                loads ../.claude/skills + 3 upstream skills + pi packages
├─ .vscode/settings.json            gitignored; only `typescript.autoClosingTags: false`
├─ apps/
│  ├─ web/          Next.js 15 App Router — UI + thin API forwarders (no DB)
│  ├─ gateway/      Fastify — auth termination, rate limiting, proxy table (no DB)
│  ├─ identity/     Fastify + Prisma — users, opaque tokens, introspection
│  ├─ catalog/      Fastify + Prisma — subjects/chapters/quizzes/question bank + ai-worker
│  ├─ assessment/   Fastify + Prisma — attempts, snapshots, scoring, legacy reporting + worker
│  ├─ analytics/    Fastify + Prisma — read models, leaderboards, exports + 2 workers
│  └─ notification/ Fastify + Prisma — announcements, push, SSE + fanout-worker
├─ packages/
│  ├─ contracts/      @quiz/contracts     Zod DTOs + Kafka event types/topics + envelope
│  ├─ kafka-kit/      @quiz/kafka-kit     client/producer, consumer runner, outbox publisher
│  ├─ redis-kit/      @quiz/redis-kit     client, key builders, rate limit Lua, leaderboard, idempotency
│  └─ observability/  @quiz/observability pino logger + x-trace-id helpers
├─ infra/
│  ├─ docker-compose.yml            18 service blocks, healthchecks, depends_on
│  ├─ docker-compose.prod.yml       adds Caddy; empties host `ports` for 11 services
│  ├─ Caddyfile                     one site block → reverse_proxy gateway:4000
│  ├─ .env.example                  12 override vars
│  ├─ .env                          gitignored (currently all-blank → dev defaults apply)
│  └─ postgres/init/01-schemas-roles.sh   5 schemas + 5 roles + grants + search_path
├─ docs/                            2 pre-split push-notification docs
├─ ARCHITECTURE.md CODE_STRUCTURE.md DEPLOYMENT.md HOSTING.md ORACLE_SETUP.md README.md TECH_STACK.md
├─ package.json  pnpm-workspace.yaml  pnpm-lock.yaml  turbo.json  tsconfig.base.json
├─ .env  .env.example  .env.local    (root env is for apps/web + local tooling ONLY)
├─ .dockerignore  .gitignore
└─ tmp/node-compile-cache/           throwaway
```

**Not in the tree despite being described in `ARCHITECTURE.md`:** `packages/auth-kit`,
`packages/config-eslint`, `packages/config-ts`, `infra/docker-compose.obs.yml`,
`infra/grafana/`, `infra/prometheus/`, any Dockerfile under `infra/` (all 8 Dockerfiles live in
`apps/*`), and `infra/postgres/init/01-schemas-roles.sql` (it is a `.sh`).

### Root config files

| File | Contents that matter |
|---|---|
| `package.json` | scripts (§1); `devDependencies`: `turbo ^2.10.7`, `typescript ^5`; `pnpm.onlyBuiltDependencies`: `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma` |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*`; `ignoredBuiltDependencies`: `@prisma/client`, `@prisma/engines`, `esbuild` |
| `turbo.json` | `ui: stream`. Tasks: `build` (`dependsOn ^build`, outputs `.next/**`, `!.next/cache/**`, `dist/**`), `prisma:generate` (cached; inputs `prisma/schema.prisma`; outputs `src/generated/prisma/**`), `dev` (uncached, persistent), `lint`/`typecheck`/`test` (`dependsOn ^build`), `test:e2e` (`dependsOn build`, uncached) |
| `tsconfig.base.json` | `target/lib ES2022`, `module esnext`, `moduleResolution bundler`, **`strict: true`**, `isolatedModules`, `forceConsistentCasingInFileNames`, `noEmit: true`. Every package/app extends this |
| `.gitignore` | Notably: **`.env*` with `!.env.example`, `!.env.production.example`, `!infra/.env.example`** (blanket-plus-exception, because a specific-filename list once missed `.env.production` which had a live DB password); `**/generated/prisma/`, `**/lib/generated/`; `.vscode/`; `.claude/settings.local.json`; and script-shaped globs `test-*.js`, `debug-*.js`, `check-*.js`, `seed-*.js`, `setup-*.js` that will silently untrack a legitimately new root-level script |

---

## 6 — `apps/web` — Next.js frontend

Package `web`. Next.js **15.5.21** App Router, React 18, Tailwind + shadcn/ui, `output: "standalone"`.
**Contains no database code and imports none of the `@quiz/*` packages.** Every server-side data
access goes through one function.

Scripts: `dev` (`next dev`) · `build` (`next build`) · `start` (`next start`) · `lint` (`next lint`) ·
`typecheck` (`tsc --noEmit`) · `test:e2e` (`playwright test`).

### 6.1 The single egress point — read this first

`apps/web/lib/gateway-client.ts` exports **`proxyToGateway(request, gatewayPath)`**:
reads `GATEWAY_URL` (default `http://localhost:4000`), copies `authorization` and `content-type`
through, sets `cache: "no-store"`, and returns **503** if the upstream is unreachable.

Every file under `apps/web/app/api/**` is a thin wrapper around it. Most also export
`export const dynamic = "force-dynamic"`. **Two exceptions call Google Gemini directly and
persist nothing:** `app/api/ai/generate-questions/route.ts` and
`app/api/generate-flashcards/route.ts` (deliberate scope boundary — see `HOSTING.md` Part 7 #6).

**Rule: never add a database client, Prisma, or a direct service URL to `apps/web`.** New backend
capability = new gateway prefix + new service route + a one-line forwarder here.

### 6.2 `app/api/**` → gateway path map (37 files, 52 handlers)

| Web route | Methods | Gateway path |
|---|---|---|
| `/api/auth/login` | POST | `/v1/auth/login` |
| `/api/auth/signup` | POST | `/v1/auth/signup` |
| `/api/subjects` | GET | `/v1/subjects` |
| `/api/subjects/[id]` | GET | `/v1/subjects/${id}` |
| `/api/subjects/[id]/chapters` | GET | `/v1/subjects/${id}/chapters` |
| `/api/chapters/[id]` | GET | `/v1/chapters/${id}` |
| `/api/chapters/[id]/quizzes` | GET | `/v1/chapters/${id}/quizzes` |
| `/api/quizzes` | GET | `/v1/quizzes` |
| `/api/attempts` | POST, GET | `/v1/attempts` |
| `/api/attempts/[id]/answers` | PATCH | `/v1/attempts/${id}/answers` |
| `/api/attempts/[id]/submit` | POST | `/v1/attempts/${id}/submit` |
| `/api/attempts/[id]/result` | GET | `/v1/attempts/${id}/result` |
| `/api/results` | GET | `/v1/legacy-results` |
| `/api/results/[id]` | GET | `/v1/legacy-results/${id}` |
| `/api/analytics` | GET | `/v1/legacy-analytics` |
| `/api/announcements` | GET | `/v1/announcements` |
| `/api/announcements/[id]` | POST | `/v1/announcements/${id}/read` |
| `/api/announcements/[id]` | PUT, DELETE | `/v1/admin/announcements/${id}` |
| `/api/announcements/[id]/repush` | POST | `/v1/admin/announcements/${id}/repush` |
| `/api/push-subscription` | POST, DELETE | `/v1/push-subscriptions` |
| `/api/admin/subjects` | POST | `/v1/admin/subjects` |
| `/api/admin/subjects` | DELETE | `/v1/admin/subjects/${id}` — id from `?id=`, 400 if missing |
| `/api/admin/subjects/[id]` | PUT, DELETE | `/v1/admin/subjects/${id}` |
| `/api/admin/chapters` | POST | `/v1/admin/chapters` |
| `/api/admin/chapters` | DELETE | `/v1/admin/chapters/${id}` — id from `?id=` |
| `/api/admin/chapters/[id]` | PUT, DELETE | `/v1/admin/chapters/${id}` |
| `/api/admin/quizzes` | GET, POST | `/v1/admin/quizzes` |
| `/api/admin/quizzes/[id]` | GET, **PATCH**, DELETE | `/v1/admin/quizzes/${id}` |
| `/api/admin/question-bank` | GET, POST | `/v1/admin/question-bank` |
| `/api/admin/question-bank/[id]` | GET, PUT, DELETE | `/v1/admin/question-bank/${id}` |
| `/api/admin/subjects-chapters-quizzes` | GET | `/v1/admin/subjects-chapters-quizzes` |
| `/api/admin/announcements` | GET, POST | `/v1/admin/announcements` |
| `/api/admin/analytics` | GET | `/v1/admin/legacy-analytics` |
| `/api/admin/results` | DELETE | `/v1/admin/legacy-results` |
| `/api/admin/users` | GET | `/v1/admin/legacy-users` |
| `/api/admin/user-performance` | GET | `/v1/admin/legacy-user-performance` |
| `/api/ai/generate-quiz` | POST | `/v1/ai/quiz-generations` |
| `/api/ai/generate-quiz/[jobId]` | GET | `/v1/ai/quiz-generations/${jobId}` |
| `/api/ai/generate-questions` | POST | **none — direct Gemini** |
| `/api/generate-flashcards` | POST | **none — direct Gemini** |

Asymmetry to remember: quizzes use **PATCH** (optimistic concurrency, requires `version`), while
subjects/chapters use **PUT**.

### 6.3 Pages (35)

`/` · `/admin` · `/admin/analytics` · `/admin/analytics/advanced` · `/admin/announcements` ·
`/admin/question-bank` · `/admin/quiz/[id]` · `/admin/users` · `/analytics` ·
`/analytics/time/[id]` · `/auth/login` · `/auth/signup` · `/clear-cache` · `/dashboard` ·
`/dashboard/attempted-quizzes` · `/dashboard/flash-cards` (+ `/2-digit`, `/3-digit`) ·
`/dashboard/full-mock-tests` · `/dashboard/recent-attempts` · `/dashboard/sectional-tests`
(+ `/[id]`, `/[id]/[chapterId]`) · `/dashboard/sectional-tests-simple` · `/debug-analytics` ·
`/diagnose` · `/goals` · `/history` · `/privacy` · `/profile` · `/quiz/[id]` · `/results/[id]` ·
`/terms` · `/test-analytics` · `/test-api`.

Only **one** layout (`app/layout.tsx`); 13 `loading.tsx`; **no `error.tsx`, `not-found.tsx`,
`template.tsx`, or `middleware.ts` anywhere**. Co-located non-route components:
`app/admin/ai-quiz-generator.tsx`, `app/admin/manage-quizzes.tsx`,
`app/admin/QuizManagementSection.tsx`, `app/admin/question-bank/ai-generator.tsx`,
`app/admin/quiz/[id]/bulk-manager.tsx`, `app/admin/quiz/[id]/question-bank-importer.tsx`.

### 6.4 Non-route source

| Path | Contents |
|---|---|
| `lib/` | `gateway-client.ts` (§6.1) · `json-upload-processor.ts` · `math-symbol-processor.ts` · `utils.ts` (`cn`) |
|`hooks/`|`use-auth.tsx` (display-only session hint) · `use-mobile.tsx` · `use-push-notifications.tsx` (requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) · `use-toast.ts`|
| `components/` (92 files) | 13 top-level (`activity-calendar`, `advanced-analytics`, `flash-questions`, `math-renderer`, `page-transition`, `protected-route`, `push-notifications-manager`, `pwa-handler`, `service-worker-registration`, `simple-advanced-analytics`, `student-analytics`, `theme-provider`, `theme-toggle`) · `analytics/` (2 v2 files) · `landing/` (7) · `layout/` (6: `app-shell`, `footer`, `mobile-page-header`, `sidebar-context`, `sidebar`, `top-header`) · `quiz/` (2) · `svgs/` (7) · `ui/` (53 shadcn primitives) |
| `public/` | `sw.js` (service worker) · `offline.html` · `manifest` via `app/manifest.ts` · `icons/` (192/512 png+svg) · `doodles/` · `logo-light.svg` |
| config | `next.config.mjs` (`images.unoptimized`, `output: standalone`, `outputFileTracingRoot` = repo root) · `tailwind.config.ts` · `postcss.config.mjs` · `components.json` · `.eslintrc.json` · `tsconfig.json` (`paths: {"@/*": ["./*"]}`) · `Dockerfile` (2-stage, `CMD ["node","apps/web/server.js"]`) |

**Duplicate files that exist and will bite you:** `components/ui/use-toast.ts` vs `hooks/use-toast.ts`;
`components/ui/use-mobile.tsx` vs `hooks/use-mobile.tsx`; `app/globals.css` vs `styles/globals.css`.
Also `app/analytics/page.tsx.backup` is checked in, and three abandoned rewrites of the same view
coexist (`components/advanced-analytics.tsx`, `simple-advanced-analytics.tsx`,
`student-analytics.tsx`, plus `components/analytics/*-v2.tsx`). Confirm which one a page actually
imports before editing.

### 6.5 `process.env` in web

`GATEWAY_URL` (`lib/gateway-client.ts:8`, default `http://localhost:4000`) ·
`GEMINI_API_KEY` (the two Gemini routes) · `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
(`hooks/use-push-notifications.tsx:157`) · `NODE_ENV` (`app/admin/analytics/page.tsx:72`) ·
`PORT`/`CI` (`playwright.config.ts`).

---

## 7 — `apps/gateway` — API gateway

Package `gateway`, port **4000**. Fastify 5 + `@fastify/cors` + `@fastify/http-proxy` + `ioredis`.
**No Prisma, no Kafka** — stateless apart from Redis.

```
apps/gateway/src/
├─ index.ts        server bootstrap, proxy table, auth + rate-limit preHandler, /healthz /readyz
├─ auth.ts         introspectToken() → POST identity-svc /v1/internal/introspect, Redis-cached 120s
└─ rate-limit.ts   enforceRateLimit() → sets X-RateLimit-Limit/Remaining, 429 on deny
```

Scripts: `dev` (`tsx watch src/index.ts`) · `start` (`tsx src/index.ts`) · `typecheck` ·
`lint` (echo stub).

### 7.1 Proxy table — 26 prefixes

`@fastify/http-proxy`, one registration per prefix, `httpMethods: [GET, POST, PUT, PATCH, DELETE]`,
`rewritePrefix === prefix` (paths pass through unchanged).

| Upstream | Prefixes |
|---|---|
| identity `:4001` | `/v1/auth` · `/v1/users` |
| catalog `:4002` | `/v1/subjects` · `/v1/chapters` · `/v1/quizzes` · `/v1/ai` · `/v1/admin/subjects-chapters-quizzes` · `/v1/admin/subjects` · `/v1/admin/chapters` · `/v1/admin/quizzes` · `/v1/admin/question-bank` |
| assessment `:4003` | `/v1/attempts` · `/v1/admin/attempts` · `/v1/legacy-results` · `/v1/legacy-analytics` · `/v1/admin/legacy-analytics` · `/v1/admin/legacy-results` · `/v1/admin/legacy-users` · `/v1/admin/legacy-user-performance` |
| analytics `:4004` | `/v1/analytics` · `/v1/leaderboards` · `/v1/admin/exports` |
| notification `:4005` | `/v1/announcements` · `/v1/admin/announcements` · `/v1/push-subscriptions` · `/v1/stream` |

**Nothing under `/internal/*` is registered — that is the whole point.** Answer keys
(`catalog /internal/quizzes/:id/full`) and bulk user lists are physically unreachable from the
public surface.

Prefix registration order matters: more specific admin prefixes are registered so that e.g.
`/v1/admin/subjects-chapters-quizzes` is not swallowed by `/v1/admin/subjects`. **When adding a
prefix, check for a shadowing conflict with an existing one.**

### 7.2 Auth pipeline (the security-critical path)

1. `isPublicRoute()` — bypasses auth for: `/healthz`, `/readyz` (any method);
   `POST /v1/auth/login`; `POST /v1/auth/signup`; **`GET /v1/stream`** (EventSource cannot send
   headers — notification-svc authenticates it with a single-use ticket instead);
   `GET /v1/subjects` + `/v1/subjects/*`; `GET /v1/chapters` + `/v1/chapters/*`;
   `GET /v1/quizzes`; `GET /v1/quizzes/<id>` (regex `^\/v1\/quizzes\/[^/]+$`).
2. Otherwise require `Authorization: Bearer <token>` → `introspectToken()`:
   Redis `GET q:auth:token:<token>`; on miss `POST {IDENTITY_SVC_URL}/v1/internal/introspect`
   and cache for **120s** (negative results cached as `""`, so a bad token does not hammer
   identity).
3. **Header scrubbing (`rewriteRequestHeaders`)** — deletes any inbound `x-user-id`,
   `x-user-name`, `x-user-email`, `x-user-is-admin`, and `expect`, then re-sets the four
   `x-user-*` from the introspection result. This is why downstream services can simply trust
   those headers, and why **a caller cannot forge admin**.
4. Rate limits applied in `preHandler` (see §16.2 for the numbers).

Failure modes: introspection throws → **503** `{"message":"Auth service unavailable"}` ·
missing/invalid bearer → **401** `{"message":"Unauthorized"}` · limit exceeded → **429**
`{"message":"Too many requests"}`.

`process.env`: `PORT` (4000) · `IDENTITY_SVC_URL` · `CATALOG_SVC_URL` · `ASSESSMENT_SVC_URL` ·
`ANALYTICS_SVC_URL` · `NOTIFICATION_SVC_URL` · (indirect) `REDIS_URL`, `LOG_LEVEL`, `NODE_ENV`.

**Checklist for "expose a new backend endpoint to the browser"** (skill:
`gateway-route-and-rate-limit`):
service route → gateway prefix (check shadowing) → public-route rule if unauthenticated →
rate-limit policy if expensive → `apps/web/app/api/**` forwarder → UI call.

---

## 8 — `apps/identity` — identity-svc (4001)

Package `identity-svc`. Owns the `identity` schema, users, and the opaque-token scheme. The
outbox publisher runs **in-process** (no separate worker container).

```
apps/identity/
├─ prisma/schema.prisma            models: User, Outbox
├─ prisma/seed.ts                  upserts admin-001, student-001 (+1)
├─ prisma/migrations/20260728160311_init/
└─ src/
   ├─ index.ts                     all 7 routes + startOutboxPublisher + graceful shutdown
   └─ outbox-store.ts              FOR UPDATE SKIP LOCKED claim + markPublished in one tx
```

Scripts: `dev` · `start` · `typecheck` · `lint` (stub) · `prisma:generate` ·
`db:migrate` (`prisma migrate deploy`) · `db:seed`.

### 8.1 Routes (7)

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | static |
| GET | `/readyz` | `SELECT 1`, 503 on failure |
| POST | `/v1/auth/login` | validates `loginRequestSchema`; **plaintext password compare**; `userType`/`isAdmin` cross-check → 403; updates `lastLogin` **and writes an Outbox `USER_CHANGED` row in the same transaction**; returns `{token, user}`. 400/401/403 |
| POST | `/v1/auth/signup` | `signupRequestSchema`; 400 if email exists; creates `isAdmin:false, userType:"student"` + Outbox `USER_CHANGED` in one tx |
| POST | `/v1/internal/introspect` | **internal only, never proxied.** `{token}` → `{valid, userId, name, email, isAdmin}`; never throws — returns `{valid:false}` |
| GET | `/v1/internal/users` | **internal only.** Bulk list for assessment-svc's legacy admin routes |
| GET | `/v1/users/:id` | 404 if missing |

### 8.2 The token scheme (implemented — not the ARCHITECTURE.md design)

Format `${userId}-${Date.now()}-${random36}`. `parseToken()` splits on the **last two dashes**
(user ids may contain dashes). Max age **30 days**. There is no signature, no JWT, no refresh
token, no denylist, and **no revocation** — a token is valid until it ages out.

`ARCHITECTURE.md` describes RS256 JWT + JWKS + refresh rotation + argon2id (Phase 2). **None of
that is implemented.** Passwords are stored and compared in plaintext. Both facts are explicit,
documented decisions for this pass (`HOSTING.md` Part 7 #1, `packages/contracts/src/dto/auth.ts`
header comment) — treat them as live risk before real user data, and do not "fix" them
incidentally without reading the migration plan (`ARCHITECTURE.md` Phase 2: dual-column password
migration, 30-day dual-accept token window).

---

## 9 — `apps/catalog` — catalog-svc (4002)

Package `catalog-svc`. Owns the `catalog` schema and **is the sole holder of answer keys**.
Two processes: api + `catalog-ai-worker`.

```
apps/catalog/
├─ prisma/schema.prisma   models: Subject, Chapter, Quiz, QuestionBankItem, AiGenerationJob, Outbox
├─ prisma/seed.ts         sample-quiz-001 "Sample Reasoning Test", 30 min, reasoning section
├─ prisma/migrations/20260728162021_init/
├─ Dockerfile             multi-stage: base → `svc` | `worker`
└─ src/
   ├─ index.ts            26 routes
   ├─ ai-worker.ts        ← WORKER: Kafka consumer, Gemini generation
   ├─ auth.ts             requireAdmin / getUserId from x-user-* headers
   ├─ outbox-store.ts
   └─ lib/database-utils.ts   parseJsonField / stringifyForDatabase (JSON-in-String columns)
```

Scripts add `worker:dev` / `worker:start` (`src/ai-worker.ts`) to the standard set.

### 9.1 Routes (26)

**Health:** `GET /healthz`, `GET /readyz`.

**Public browsing (7)** — these are the gateway's unauthenticated GETs:

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/subjects` | subjects + nested chapters + `chapterCount`/`quizCount` |
| GET | `/v1/subjects/:id` | 404 |
| GET | `/v1/subjects/:id/chapters` | ordered by name, with quiz/question counts |
| GET | `/v1/chapters/:id` | includes subject; 404 |
| GET | `/v1/chapters/:id/quizzes` | active only, `createdAt asc` |
| GET | `/v1/quizzes` | active only, **metadata only** |
| GET | `/v1/quizzes/:id` | **metadata only — `correctAnswer` is structurally absent from this path** |

**Internal (never proxied) (2):**

| Method | Path | Notes |
|---|---|---|
| GET | `/internal/quizzes/:id/full` | **answer keys + explanations.** Only assessment-svc calls it, once per attempt start |
| GET | `/internal/quizzes-meta` | bulk quiz→chapter→subject names for legacy reporting (no keys) |

**Admin — subjects (3), chapters (3):** `POST`/`PUT`/`DELETE` on `/v1/admin/subjects[/:id]` and
`/v1/admin/chapters[/:id]`. 400 on missing name, 404 on missing parent, **409 on duplicate name**,
**409 on delete when children have quizzes**. Every mutation publishes `SUBJECT_CHANGED` /
`CHAPTER_CHANGED` (direct produce).

**Admin — quizzes (6):**

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/admin/quizzes` | **deliberately omits attempts/avgScore/avgTime** — that data belongs to analytics-svc (`GET /v1/analytics/quizzes`) |
| POST | `/v1/admin/quizzes` | field-level validation array: title 3–200, duration 5–300, `chapterId` required, ≥1 section, `negativeMarkValue` 0.1–1.0. Creates quiz + Outbox `QUIZ_CHANGED` in one tx |
| GET | `/v1/admin/quizzes/:id` | 404 |
| **PATCH** | `/v1/admin/quizzes/:id` | **optimistic concurrency**: body must carry `version`; `updateMany where {id, version}`; 0 rows → **409 "modified by someone else"**; increments `version`; Outbox `QUIZ_CHANGED` in same tx |
| DELETE | `/v1/admin/quizzes/:id` | |
| GET | `/v1/admin/subjects-chapters-quizzes` | nested tree for admin pickers |

**Admin — question bank (5):** `GET /v1/admin/question-bank` (query `page`, `limit` (1/20),
`section`, `difficulty`, `tag` contains, `search` OR over question/explanation case-insensitive;
returns `pagination`) · `POST` (requires exactly **4 options**, `correctAnswer` 0–3, difficulty
defaults `medium`) · `GET/PUT/DELETE /v1/admin/question-bank/:id` (PUT whitelists: section,
question, correctAnswer, explanation, difficulty, image, source, isVerified, options, tags).

**AI (2):**

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/ai/quiz-generations` | needs `x-user-id` (401); 400 without title/sections; creates `AiGenerationJob` (`pending`); **direct produce** `AI_QUIZ_GENERATION_REQUESTED`; **202 `{jobId}`**; 503 if publish fails |
| GET | `/v1/ai/quiz-generations/:jobId` | 404; returns the full job row (poll target for the UI) |

### 9.2 `src/ai-worker.ts`

Kafka consumer, `groupId: "catalog-ai-worker"`, topic `AI_QUIZ_GENERATION_REQUESTED`,
`maxPollIntervalMs: 15 * 60_000`. Model **`gemini-1.5-flash`**; prompt requests 4 options /
1 correct / explanation / tags; parses the first `{...}` block.

**Per-section persistence** is the important behaviour: `partialQuestions` is written after *each*
section, so one failed section no longer discards all prior work (the monolith bug). Failures
accumulate in `failures[]` and the loop continues. Final status: `succeeded` (0 failures) /
`partial` / `failed`. If any questions were produced it creates a `Quiz` (timeLimit 30,
negativeMarking true, 0.25) with `isActive = (status === "succeeded")` — **partials land as an
inactive reviewable draft**. Emits `AI_QUIZ_GENERATION_COMPLETED` with counts, failures, `elapsedMs`.

Two self-documented gaps: `hasProcessed` is a **stub returning `false`** (no real consumer-side
dedupe here), and the file itself notes that a job queue fits this shape better than Kafka.
Additionally the job row only stores `title`/`sections`/`difficulty`/`questionsPerSection`, so
**`chapterId`/`duration`/`negativeMarking` are not carried through** — generated quizzes land with
defaults and no chapter (`HOSTING.md` Part 7 #3; fixing it needs an `AiGenerationJob` schema
addition, not just a route change).

`process.env`: `PORT` (4002) · `GEMINI_API_KEY` (`src/ai-worker.ts:9`, default `""` → job status
`failed`, never a crash) · `DATABASE_URL` · indirect `KAFKA_BROKERS`, `LOG_LEVEL`, `NODE_ENV`.

**JSON-in-String columns:** `Quiz.sections`/`questions`, `QuestionBankItem.options`/`tags` are
`String` columns holding JSON. Always go through `src/lib/database-utils.ts`
(`parseJsonField` / `stringifyForDatabase`) — never `JSON.parse` inline. Normalizing these is
`ARCHITECTURE.md` Phase 8 (not done).

---

## 10 — `apps/assessment` — assessment-svc (4003)

Package `assessment-svc`. Owns the `assessment` schema: attempts, snapshots, answers, **scoring**,
plus the legacy `QuizResult` reporting surface. The **only high-write path** in the system and the
only service where a bug loses user work. Two processes: api + `assessment-worker`.

```
apps/assessment/
├─ prisma/schema.prisma   enum AttemptStatus; models Attempt, AttemptSnapshot, AttemptAnswer,
│                          QuizResult (legacy), Outbox
├─ prisma/migrations/20260728170000_init/   ← contains 2 partial indexes as raw SQL
├─ tests/scoring.test.ts  ← THE ONLY UNIT TEST SUITE IN THE REPO (26 golden fixtures)
├─ Dockerfile (+ Dockerfile.debug)          base → `svc` | `worker`
└─ src/
   ├─ index.ts            8 routes
   ├─ legacy.ts           7 legacy reporting routes
   ├─ attempt-service.ts  startOrResumeAttempt / autosaveAnswers / submitAttempt / getResult
   │                       + NotFoundError / ForbiddenError / ConflictError
   ├─ attempt-result.ts   formatAttemptResult (documents a preserved seconds-vs-ms inconsistency)
   ├─ lib/scoring.ts      scoreQuiz — the reference scoring implementation
   ├─ catalog-client.ts   fetchFullQuiz → catalog /internal/quizzes/:id/full
   ├─ legacy-client.ts    fetchAllUsers / fetchUserById / fetchQuizMeta
   ├─ auth.ts             requireUser / requireAdmin / getUser (incl. name+email)
   └─ worker.ts           ← WORKER: outbox publisher + expiry sweeper
```

Scripts: standard + `worker:dev`/`worker:start` + **`test` (`vitest run`)**.

### 10.1 Routes — `src/index.ts` (8)

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz`, `/readyz` | |
| POST | `/v1/attempts` | `startAttemptRequestSchema` (`quizId`, optional `clientIdemKey`). **201** new / **200** resumed. Snapshots the quiz via catalog, **strips answer keys from the response**. 400 · 403 (inactive quiz) · 404 · 409 (in-flight attempt) |
| PATCH | `/v1/attempts/:id/answers` | `autosaveRequestSchema`; returns `{saved: n}`; **409** if not `IN_PROGRESS` or expired; `clientSeq` guards stale/out-of-order writes across tabs |
| POST | `/v1/attempts/:id/submit` | `submitAttemptRequestSchema`, `submitSource` default `"user"`; **Postgres compare-and-swap**; a second submit replays the stored result |
| GET | `/v1/attempts/:id/result` | sets `Cache-Control: private, no-store`; **409 unless `status = SUBMITTED`** — this is the gate that keeps answer keys hidden |
| GET | `/v1/attempts` | **cursor-paginated history**: `limit` 1–100 (20), `cursor`, `status` → `{attempts[], nextCursor}`. Collapses the monolith's three near-duplicate results routes |
| GET | `/v1/admin/attempts` | admin; `limit`, `cursor`, `status`, `quizId`, `userId` |
| DELETE | `/v1/admin/attempts/:id` | admin; `AttemptAnswer` cascades; 404 |

`handleServiceError` maps `NotFoundError`→404, `ForbiddenError`→403, `ConflictError`→409, else rethrow.

### 10.2 Routes — `src/legacy.ts` (7)

Read-mostly admin/self reporting over pre-split `QuizResult` rows. **New scores never write here.**

`GET /v1/legacy-results` (own, quiz titles via `fetchQuizMeta`) · `GET /v1/legacy-results/:id`
(admin any, else own; back-fills explanations/options from `fetchFullQuiz`) ·
`GET /v1/legacy-analytics` (own: totals, averages, best, recent 10, subject/chapter stats, 30-day
trend; `no-cache, no-store, must-revalidate`) · `GET /v1/admin/legacy-analytics` (global totals +
recent 20 + all results/quizzes) · `DELETE /v1/admin/legacy-results` (query `id` | `userId`+`quizId`
| `userId` | `quizId`; 400 if none, 404 if `id` missing) · `GET /v1/admin/legacy-users` (joins
identity `fetchAllUsers()` with local results) · `GET /v1/admin/legacy-user-performance`
(requires `?userId=`, 400/404).

These have **not** been re-pointed at analytics-svc's proper read models — that is the natural next
step, deliberately not done (`HOSTING.md` Part 7 #4).

### 10.3 The attempt state machine — invariants you must not break

```
POST /v1/attempts ──▶ IN_PROGRESS ──▶ PATCH answers (many) ──▶ POST submit ──▶ SUBMITTED
                          │                                        ▲
                          └──── expiresAt passes ──▶ sweeper ──────┘  (submitSource='sweeper')
```

| Invariant | Enforced by |
|---|---|
| One live attempt per (user, quiz) | raw-SQL partial unique index `attempt_one_inflight ON assessment.attempt (user_id, quiz_id) WHERE status='IN_PROGRESS'` |
| Sweeper index stays tiny | `attempt_sweeper ON (expires_at) WHERE status='IN_PROGRESS'` |
| Timer authority is the **server** | `startedAt`/`expiresAt` written to Postgres synchronously at start; client renders from `remainingMs` + `serverTime` drift correction |
| Submit is idempotent | `UPDATE ... SET status='SUBMITTED' WHERE id=$1 AND status='IN_PROGRESS'` — 0 rows ⇒ replay stored result. **Postgres is the arbiter, never Redis** |
| Idempotency-key replay | `Attempt @@unique([userId, clientIdemKey])` |
| Scoring happens **only** server-side from the snapshot | `submitAttempt` + `src/lib/scoring.ts` |
| An admin editing a quiz mid-exam cannot change it | `AttemptSnapshot`, deduped `@@unique([quizId, contentHash])` |
| Answer keys never reach a live attempt | start/autosave responses strip `correctAnswer`; result route requires `SUBMITTED` |

**Both partial indexes exist only in the migration SQL** (Prisma cannot express them). If you ever
regenerate that migration, re-add them by hand.

### 10.4 `src/worker.ts`

Two jobs: (a) the outbox publisher, (b) the **expiry sweeper** — every `SWEEP_INTERVAL_MS`
(default 15 000) it selects `status: IN_PROGRESS, expiresAt <= now` (`take: SWEEP_BATCH_SIZE`,
default 100) and calls the **same** `submitAttempt(prisma, id, null, "sweeper")` the API uses.
**No distributed lock by design** — the CAS makes a double sweep a no-op. There is deliberately
**no `attempt-expired` topic**: the sweeper emits `ATTEMPT_SUBMITTED` with `submitSource='sweeper'`.

### 10.5 Scoring

`src/lib/scoring.ts` is the single implementation; `tests/scoring.test.ts` locks it with 26
table-driven golden fixtures covering negative marking and the **`totalScore` floors at 0**
behaviour. **Any change to scoring must update these fixtures in the same commit, with a stated
reason.** Never reintroduce client-side scoring in `apps/web`.

`process.env`: `PORT` (4003) · `SWEEP_INTERVAL_MS` (15000) · `SWEEP_BATCH_SIZE` (100) ·
`CATALOG_SVC_URL` · `IDENTITY_SVC_URL` · `DATABASE_URL` · indirect `KAFKA_BROKERS`, `LOG_LEVEL`,
`NODE_ENV`. (No `REDIS_URL` — the Redis write-behind cache from `ARCHITECTURE.md` is **not**
implemented; autosave writes straight to Postgres.)

---

## 11 — `apps/analytics` — analytics-svc (4004)

Package `analytics-svc`. **Owns zero authoritative data** — every one of its 15 tables is derived
and rebuildable by resetting the consumer group to offset 0. Three processes: api +
`analytics-rollup-consumer` + `analytics-export-worker`. Extra deps: `@aws-sdk/client-s3`,
`@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`, `pg`.

```
apps/analytics/
├─ prisma/schema.prisma   15 models (below)
├─ prisma/migrations/20260728180000_init/
├─ Dockerfile             base → `svc` | `rollup-consumer` | `export-worker`
└─ src/
   ├─ index.ts            8 routes
   ├─ rollup-consumer.ts  ← WORKER 1: 7 topics → projections (the core of the service)
   ├─ export-worker.ts    ← WORKER 2: EXPORT_REQUESTED → streamed CSV → MinIO
   ├─ object-store.ts     shared S3Client (forcePathStyle for MinIO), EXPORT_BUCKET
   ├─ csv.ts              csvEscape / csvRow
   └─ auth.ts             requireAdmin / getUserId
```

**No `outbox-store.ts`** — owning no authoritative data, it uses direct produce, not the outbox.
Scripts: `dev`/`start`, `rollup-consumer:dev`/`:start`, `export-worker:dev`/`:start`, `typecheck`,
`lint` (stub), `prisma:generate`, `db:migrate`. **No `db:seed`** (nothing to seed).

### 11.1 Models (15)

`DimUser` · `DimQuiz` · `DimChapter` · `DimSubject` (projections from compacted-style topics) ·
`AttemptFact` · `AttemptSectionFact` · `QuestionStat` · `UserStats` · `QuizStats` · `DailyRollup` ·
`UserDailyActivity` · `QuizUserSeen` · `ExportJob` · `ProcessedEvent` · `BackfillState`.

### 11.2 Routes (8)

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz`, `/readyz` | |
| GET | `/v1/analytics/overview` | Redis cache-aside, TTL **300 s** (`keys.cacheAnalyticsOverview()`); 30-day `DailyRollup` where `quizId="__all__"` and `subjectId="__all__"`, + `DimUser` count + `QuizStats` count. Deliberately **no** single-flight lock — two cold requests may both compute |
| GET | `/v1/analytics/quizzes` | `?ids=a,b,c` → bulk `QuizStats`. **Exists because catalog's admin list intentionally dropped attempts/avgScore/avgTime** |
| GET | `/v1/analytics/quizzes/:id` | `QuizStats` + `groupBy(section)` averages + per-question stats with computed `pValue` and `avgTimeMs`; 404 if no stats yet |
| GET | `/v1/analytics/users/:id` | 401 without `x-user-id`; **403 unless self or admin**; `UserStats` + 90-day `UserDailyActivity`; 404 if no stats |
| GET | `/v1/leaderboards/:scope` | scope ∈ `global` \| `weekly` \| `quiz:<id>` \| `subject:<id>`, else **400**; `?limit` 1–100 (10); reads Redis sorted sets |
| POST | `/v1/admin/exports` | admin; `kind` ∈ `quiz-results` (default) \| `user-performance`; `filters.{from,to,quizIds,subjectIds}`; creates `ExportJob` (`pending`); **direct produce** `EXPORT_REQUESTED`; **202 `{jobId}`**; 503 on publish failure |
| GET | `/v1/admin/exports/:id` | admin; 404; when `status==="done" && objectKey`, returns a **presigned GET URL** (`downloadUrl`, 24 h) |

### 11.3 `src/rollup-consumer.ts` — the projection pattern

`groupId: "analytics-rollup-consumer"`, 7 topics: `ATTEMPT_SUBMITTED`, `ATTEMPT_STARTED`,
`QUIZ_CHANGED`, `CHAPTER_CHANGED`, `SUBJECT_CHANGED`, `USER_CHANGED`, `USER_ERASURE_REQUESTED`.

**Idempotency (the strict, correct pattern — copy this one):** `runConsumer` pre-checks
`ProcessedEvent.hasProcessed(eventId)`, **and** every handler calls `markProcessed(tx, eventId)`
*inside the same transaction* as the projection write. A P2002 unique violation therefore rolls the
whole projection back instead of double-applying.

| Handler | Writes |
|---|---|
| `handleAttemptSubmitted` | resolves `chapterId`/`subjectId` from its **own** `DimQuiz` (event-carried state transfer — nulls if `quiz-changed` hasn't arrived). Writes `AttemptFact`, `AttemptSectionFact` per section, `QuestionStat` (`optionCounts` map incl. an `"unanswered"` key), `QuizUserSeen` via `INSERT ... ON CONFLICT DO NOTHING` (exact unique users, O(1) — HyperLogLog deliberately rejected), `QuizStats` (incl. `passCount` where `totalScore >= 40`), `UserStats` (rolling `last20Scores`/`last20Avg`, day-gap streaks), `UserDailyActivity`, and **3 `DailyRollup` buckets** (`quiz+__all__`, `__all__+subject`, `__all__+__all__`). Then best-effort **outside** the tx: `recordLeaderboardEntry` + `redis.del` of 3 cache keys |
| `handleQuizChanged` | upserts `DimQuiz` (resolves `subjectId` via `DimChapter` if absent); busts quiz + overview caches |
| `handleChapterChanged` | upserts `DimChapter`, then `dimQuiz.updateMany` to re-resolve stale `subjectId` — **handles quiz-changed arriving before chapter-changed** (no cross-topic ordering guarantee) |
| `handleSubjectChanged` | upserts `DimSubject` |
| `handleUserChanged` | upserts `DimUser`; busts user cache |
| `handleUserErasureRequested` | scrubs `DimUser` (`name`/`email` → `"[erased]"`, sets `deletedAt`). **`AttemptFact`/`AttemptSectionFact` are deliberately NOT redacted** — historical denormalization |
| `handleAttemptStarted` | **marks processed only, writes nothing** — consumed purely so the offset advances; the abandonment metric was cut |

### 11.4 `src/export-worker.ts`

`groupId: "analytics-export-worker"`, topic `EXPORT_REQUESTED`, `maxPollIntervalMs: 15 * 60_000`.
**Constant memory at any row count:** a Prisma keyset-paginated async generator (`PAGE_SIZE = 500`)
feeds `Readable.from(...)` into `@aws-sdk/lib-storage`'s multipart `Upload`. (Explicitly *not*
Postgres `COPY` in this pass — no `pg-copy-streams` dependency.)

- `quizResultsRows(filters)` header: `attemptId, quizId, quizTitle, userId, userName, submittedAt,
  totalScore, correctCount, wrongCount, unansweredCount, timeSpentMs`; filters `submittedAt`
  gte/lte, `quizId in`, `subjectId in`; batch-resolves `DimQuiz`/`DimUser` per page.
- `userPerformanceRows()` header: `userId, userName, email, attempts, avgScore, bestScore,
  last20Avg, currentStreakDays, longestStreakDays, lastAttemptAt`.

Object key `${kind}/${jobId}.csv`. `ExportJob`: `pending` → `running` → `done`
(`objectKey`/`rowCount`/`completedAt`) or `failed` (`error`); `rowCount` excludes the header.
`PRESIGNED_TTL_SEC` = 24 h. Emits `EXPORT_COMPLETED` either way.

`process.env`: `PORT` (4004) · `EXPORT_BUCKET` (`quiz-exports`) · `S3_ENDPOINT`
(`http://localhost:9000`) · `S3_REGION` (`us-east-1`) · `S3_ACCESS_KEY`/`S3_SECRET_KEY`
(`minioadmin`) · `DATABASE_URL` · indirect `KAFKA_BROKERS`, `REDIS_URL`, `LOG_LEVEL`, `NODE_ENV`.

---

## 12 — `apps/notification` — notification-svc (4005)

Package `notification-svc`. The **failure-domain service**: everything slow, flaky and
third-party-dependent (web-push to Apple/Google/Mozilla) lives here, and it holds long-lived SSE
connections — which is why it can never run on a serverless host. Two processes: api +
`notification-worker` (fanout).

```
apps/notification/
├─ prisma/schema.prisma   models: Announcement, AnnouncementRead, PushSubscription, UserRef,
│                          ProcessedEvent, Outbox
├─ prisma/migrations/20260728190000_init/
├─ Dockerfile             base → `svc` | `worker`
└─ src/
   ├─ index.ts            13 routes
   ├─ fanout-worker.ts    ← WORKER: 4 topics, two-stage push fanout
   ├─ push.ts             sendPushToSubscription; lazy VAPID config; HTTP 410 → deactivate
   ├─ sse.ts              publishToUser / publishBroadcast / getBacklogSince (BACKLOG_MAX=50, 1h TTL)
   ├─ outbox-store.ts
   └─ auth.ts             requireUser / requireAdmin / getUser
```

### 12.1 Routes (13)

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz`, `/readyz` | |
| GET | `/v1/announcements` | active + non-expired, `priority desc, createdAt desc`, per-user `isRead` + `unreadCount` |
| POST | `/v1/announcements/:id/read` | upsert `AnnouncementRead` (unique `announcementId_userId`) |
| GET | `/v1/admin/announcements` | + `readCount`, `totalUsers` (from `UserRef`), `readPercentage` |
| POST | `/v1/admin/announcements` | 400 without title/content; priority default `normal`; **announcement + Outbox `ANNOUNCEMENT_PUBLISHED` in ONE transaction** — this replaced the monolith's inline per-subscription push loop |
| PUT | `/v1/admin/announcements/:id` | partial: title, content, priority, isActive, expiresAt; 404 |
| DELETE | `/v1/admin/announcements/:id` | 404 |
| POST | `/v1/admin/announcements/:id/repush` | 404; **direct produce** with a **fresh `eventId`** so the fanout worker's eventId-keyed dedupe treats it as a new fanout rather than a replay; 503 on publish failure |
| POST | `/v1/push-subscriptions` | `{endpoint, keys:{p256dh, auth}}`; 400 if invalid; upsert on `userId_endpoint`; records `userAgent`, `lastUsedAt`; reactivates |
| DELETE | `/v1/push-subscriptions` | requires `?endpoint=` (400); 404; **soft delete** (`isActive:false`) |
| POST | `/v1/stream/tickets` | authenticated; mints `randomUUID` into Redis, **TTL 30 s**; returns `{ticket, expiresInSec}` |
| GET | `/v1/stream` | **public at the gateway, authenticates itself**: requires `?ticket=`, consumed with Redis **`GETDEL`** (single-use, unreplayable), else 401. Then `reply.hijack()`, `text/event-stream` + `no-cache` + `keep-alive` + `X-Accel-Buffering: no`, replays backlog from `Last-Event-ID`, subscribes a **duplicated** Redis client to `pubsubUser(userId)` + `pubsubBroadcast()`, **15 s heartbeat**, cleans up on `request.raw.on("close")` |

SSE, not WebSocket — traffic is server→client only, and SSE gets browser reconnection with
`Last-Event-ID` replay for free.

### 12.2 `src/fanout-worker.ts` — two-stage push

`groupId: "notification-fanout-worker"`; topics `ANNOUNCEMENT_PUBLISHED`, `PUSH_SEND_REQUESTED`,
`USER_CHANGED`, `USER_ERASURE_REQUESTED`; `FANOUT_PAGE_SIZE = 100`.

1. **`ANNOUNCEMENT_PUBLISHED`** → `publishBroadcast(redis, "announcement", …)` for instant SSE (no
   DB read), then keyset-pages `PushSubscription where isActive` 100 at a time, emitting **one
   `PUSH_SEND_REQUESTED` per subscription** via `producer.sendBatch` (key = `userId`, body
   truncated to 100 chars, `url: "/dashboard"`, `tag: announcement-<id>`,
   `dedupeKey: <announcementId>:<subId>`).
2. **`PUSH_SEND_REQUESTED`** → `sendPushToSubscription()` for that one subscription.

This is the replacement for the monolith's nested unbounded `Promise.all` that awaited one HTTP
send **plus** one DB UPDATE per subscription inside the announcement request. **A broadcast to
10 000 users must never be 10 000 records produced from a request thread — keep the two stages.**

Projections: `USER_CHANGED` → upsert `UserRef`; `USER_ERASURE_REQUESTED` → **hard delete**
`PushSubscription` + `UserRef` (contrast with analytics' redact-only: endpoints/keys are live
secrets).

`push.ts`: lazily calls `webpush.setVapidDetails` once when all three VAPID vars are present, else
returns `{sent:false, reason:"VAPID keys not configured"}` (no crash); icon/badge
`/icons/icon-192x192.svg`; `requireInteraction` for `urgent`/`high`; **`WebPushError` 410 →
`isActive:false`** and *not* an error — a dead endpoint is a success.

`markProcessed` here writes `ProcessedEvent` best-effort **outside** a transaction — weaker than
analytics' pattern. Prefer analytics' pattern for new consumers.

`process.env`: `PORT` (4005) · `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_EMAIL` (used as
`mailto:`) · `DATABASE_URL` · indirect `KAFKA_BROKERS`, `REDIS_URL`, `LOG_LEVEL`, `NODE_ENV`.

---

## 13 — `packages/*` — shared libraries

**Four packages, all source-only.** Each has `"main"`/`"types"` → `./src/index.ts`, **no `exports`
field, no build step, and `typecheck` as its only script.** Consumers compile the TS directly
(tsx / Next). Intra-package relative imports use the ESM `.js` extension convention even though
the files are `.ts` — follow that.

### 13.1 `@quiz/contracts` — the single source of truth for shapes

```
packages/contracts/src/
├─ index.ts                barrel: events/envelope, events/topics, dto/auth, dto/attempts, dto/catalog
├─ dto/auth.ts             loginRequestSchema, LoginRequest, signupRequestSchema, SignupRequest,
│                          AuthUserDTO, AuthResponseDTO, TokenIntrospectionDTO
├─ dto/attempts.ts         startAttemptRequestSchema, autosaveAnswerSchema, autosaveRequestSchema,
│                          submitAttemptRequestSchema (+ inferred types),
│                          AttemptQuestionDTO (NO correctAnswer/explanation),
│                          StartAttemptResponseDTO
├─ dto/catalog.ts          PURE INTERFACES, no zod: QuizSummaryDTO, FullQuizQuestionDTO (has
│                          correctAnswer), FullQuizDTO, SubjectDTO, ChapterDTO
├─ events/topics.ts        TOPICS (13) + TopicName + 14 payload interfaces
└─ events/envelope.ts      EventEnvelope<T>, createEnvelope()
```

Key type-level invariant: **`AttemptQuestionDTO` has no `correctAnswer`; `FullQuizQuestionDTO`
does.** The type system, not a code-review convention, is what keeps answer keys off the
student-facing path. Never widen `AttemptQuestionDTO`.

### 13.2 `@quiz/kafka-kit`

```
packages/kafka-kit/src/
├─ index.ts     re-exports client/outbox/consumer + { createEnvelope, TOPICS, EventEnvelope }
│               from @quiz/contracts (so services need not import contracts directly for events)
├─ client.ts    createKafka(clientId, brokers=KAFKA_BROKERS||"localhost:19092")
│               → logLevel WARN, retry {initialRetryTime:300, retries:15}
│               getProducer(kafka) → per-process singleton, {idempotent:true, maxInFlightRequests:5}
├─ consumer.ts  ProcessedEventStore, ConsumerHandlerContext<T>,
│               runConsumer<T>({groupId, topics, store, onMessage, maxPollIntervalMs?})
└─ outbox.ts    OutboxRow, OutboxStore{withClaimedBatch, markPublished},
                publishOutboxBatch(producer, store, batchSize=100),
                startOutboxPublisher(producer, store, intervalMs=2000) → stop()
```

There is **no `producer.ts`, no `envelope.ts`, and no `dlq.ts`** — producer helpers live in
`client.ts`, the envelope lives in contracts, and **no DLQ exists anywhere** (see §19).

`runConsumer` behaviour: subscribes `fromBeginning: true`, `maxWaitTimeInMs: 500`; skips empty
values; on JSON parse failure logs `"failed to parse message, sending to DLQ path:"` and
**returns — silently dropping the message**; then `store.hasProcessed(eventId)` early-return; then
`onMessage`.

`publishOutboxBatch` sends `key: row.key`, `value: row.payload === null ? null :
JSON.stringify(row.payload)` (**null = tombstone**, for compaction), `headers: row.headers ?? {}`.
It deliberately swallows pre-migration errors (`P2010`, `42P01`, `relation "Outbox" does not exist`)
and returns 0, so a service boots cleanly before its first migration.

### 13.3 `@quiz/redis-kit`

```
packages/redis-kit/src/
├─ client.ts       getRedisClient(url=REDIS_URL||"redis://localhost:6380") — process singleton,
│                  {maxRetriesPerRequest:3, lazyConnect:false}
├─ keys.ts         `keys` — 21 builders, the ONLY place a Redis key pattern may be written (§16.1)
├─ rateLimit.ts    SLIDING_WINDOW_LUA, RateLimitPolicy, RateLimitResult,
│                  checkRateLimit(redis, policy, subject), RATE_LIMIT_POLICIES (9) (§16.2)
├─ leaderboard.ts  encodeLeaderboardScore / decodeLeaderboardScore / isoWeek /
│                  recordLeaderboardEntry / getLeaderboard (§16.3)
└─ idempotency.ts  withIdempotency(redis, key, ttl, fn) → ok | in_progress | replayed
```

`withIdempotency` is deliberately **not** used for attempt submit (that is a Postgres CAS).
`in_progress` means the caller should reply 409 `IDEMPOTENT_REQUEST_IN_PROGRESS`.

### 13.4 `@quiz/observability`

`createLogger(serviceName)` → pino (`LOG_LEVEL` default `info`, `pino-pretty` transport when
`NODE_ENV !== "production"`) · `getOrCreateTraceId(headerValue)` → the header if a non-empty string,
else `randomUUID()` · `TRACE_HEADER = "x-trace-id"`.

**There is no OpenTelemetry here** despite `ARCHITECTURE.md` describing "pino, OTel init,
request-id propagation". One propagated `x-trace-id` plus structured pino logs is the whole
observability story; every service registers an `onRequest` hook for it. Deliberately not
scaffolded with non-functional Prometheus/Grafana/Jaeger containers (`HOSTING.md` Part 7 #5).

`apps/web` imports **none** of these four packages.

---

## 14 — Data layer — Postgres, schemas, roles, Prisma

**One Postgres instance, one database `quiz`, five schemas, five login roles.** Not
database-per-service: five databases would mean five connection pools, five backup/restore
procedures and five migration states to keep in lockstep. Schema-per-service with distinct roles
buys the only property that matters architecturally — **a cross-service join is physically
impossible, not merely a convention** — at a fifth of the operational cost.

### 14.1 `infra/postgres/init/01-schemas-roles.sh`

Runs **only on a fresh `postgres-data` volume** (Postgres executes
`/docker-entrypoint-initdb.d` scripts exactly once). It is a `.sh`, not a `.sql`, so per-role
passwords can come from container env. Superuser is `quiz_admin`; database `quiz`.

For each of `identity`, `catalog`, `assessment`, `analytics`, `notification`:

1. `CREATE SCHEMA IF NOT EXISTS <x>`
2. `CREATE ROLE <x>_rw LOGIN PASSWORD '<env or <x>_rw_pw>'` (guarded by a `pg_roles` check)
3. `ALTER SCHEMA <x> OWNER TO <x>_rw`
4. `REVOKE ALL ON SCHEMA <x> FROM PUBLIC`
5. `GRANT ALL ON SCHEMA <x> TO <x>_rw`
6. `ALTER ROLE <x>_rw SET search_path = <x>`
7. `ALTER DEFAULT PRIVILEGES FOR ROLE <x>_rw IN SCHEMA <x> GRANT ALL ON TABLES TO <x>_rw`

Because `search_path` is pinned per role, **no Prisma schema needs `multiSchema` or `@@schema`**.

If you see `role does not exist` on `db:migrate`, the volume predates the script:
`docker compose -f infra/docker-compose.yml down -v` (destructive) or apply it manually with
`docker compose exec postgres psql -U quiz_admin -d quiz -f /docker-entrypoint-initdb.d/01-schemas-roles.sh`.

### 14.2 Prisma — one client per service

| Service | schema.prisma | Models | Enums | Migration | Seed |
|---|---|---|---|---|---|
| identity | `apps/identity/prisma/schema.prisma` | 2 — `User`, `Outbox` | — | `20260728160311_init` | ✅ `prisma/seed.ts` |
| catalog | `apps/catalog/prisma/schema.prisma` | 6 — `Subject`, `Chapter`, `Quiz`, `QuestionBankItem`, `AiGenerationJob`, `Outbox` | — | `20260728162021_init` | ✅ `prisma/seed.ts` |
| assessment | `apps/assessment/prisma/schema.prisma` | 5 — `Attempt`, `AttemptSnapshot`, `AttemptAnswer`, `QuizResult` (legacy), `Outbox` | `AttemptStatus` (`IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `ABANDONED`) | `20260728170000_init` | ❌ **script points at a nonexistent file** |
| analytics | `apps/analytics/prisma/schema.prisma` | 15 (§11.1) | — | `20260728180000_init` | — (none needed) |
| notification | `apps/notification/prisma/schema.prisma` | 6 — `Announcement`, `AnnouncementRead`, `PushSubscription`, `UserRef`, `ProcessedEvent`, `Outbox` | — | `20260728190000_init` | — |
| gateway, web | none | — | — | — | — |

Every service uses:

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

- **`output` is service-local by necessity** — pnpm hoists one shared `@prisma/client`, so the
  default output path would let five services clobber each other's client.
- `linux-musl-openssl-3.0.x` is required because the images are Alpine; without it, a
  Windows-generated engine breaks in the container.
- `**/generated/prisma/` is gitignored → **`pnpm db:generate` is a mandatory first step** after
  clone, after a schema edit, and in CI (it is step 5 of `ci.yml`).

Every service is on a **single `_init` migration** — there is no incremental history yet.

### 14.3 Rules for schema changes (skill: `prisma-database-change`)

1. **Never** add a foreign key across schemas. Cross-schema references are soft (`quizId String`),
   by design.
2. `prisma migrate deploy` against anything with data — **never `migrate dev`** (`HOSTING.md` Part 6).
3. Order across services does not matter (no cross-schema FKs), but migrate identity + catalog
   first, since attempt-start assumes a quiz exists to snapshot.
4. Indexes Prisma cannot express (partial/`CONCURRENTLY`) go in the migration SQL by hand —
   assessment already has two (§10.3); do not lose them.
5. Existing important indexes: `Attempt @@unique([userId, clientIdemKey])`,
   `@@index([userId, submittedAt])`, `@@index([quizId, totalScore])`;
   `AttemptSnapshot @@unique([quizId, contentHash])`;
   `AttemptAnswer @@id([attemptId, questionId])` with `onDelete: Cascade`;
   `QuizResult @@index([userId, date])`, `@@index([quizId])`;
   `AnnouncementRead` unique `announcementId_userId`; `PushSubscription` unique `userId_endpoint`.
6. A backup is instance-wide, so a restore is all-or-nothing across all five schemas.

---

## 15 — Kafka / Redpanda — topics, envelope, outbox, idempotency

Naming convention **`quiz.<domain>.<event>.v<n>`**, all defined in
`packages/contracts/src/events/topics.ts` as `TOPICS`. Brokers: `redpanda:9092` inside Docker,
`localhost:19092` from the host (`KAFKA_BROKERS` default).

### 15.1 The 13 topics

| `TOPICS` key | Topic | Produced by | Consumed by |
|---|---|---|---|
| `ATTEMPT_SUBMITTED` | `quiz.assessment.attempt-submitted.v1` | assessment (outbox) | analytics rollup |
| `ATTEMPT_STARTED` | `quiz.assessment.attempt-started.v1` | assessment | analytics rollup (**offset-advance only**) |
| `QUIZ_CHANGED` | `quiz.catalog.quiz-changed.v1` | catalog (outbox) | analytics rollup |
| `CHAPTER_CHANGED` | `quiz.catalog.chapter-changed.v1` | catalog (direct) | analytics rollup |
| `SUBJECT_CHANGED` | `quiz.catalog.subject-changed.v1` | catalog (direct) | analytics rollup |
| `USER_CHANGED` | `quiz.identity.user-changed.v1` | identity (outbox) | analytics rollup, notification fanout |
| `USER_ERASURE_REQUESTED` | `quiz.identity.user-erasure-requested.v1` | identity | analytics (redact), notification (hard delete) |
| `ANNOUNCEMENT_PUBLISHED` | `quiz.notification.announcement-published.v1` | notification (outbox; repush = direct) | notification fanout |
| `PUSH_SEND_REQUESTED` | `quiz.notification.push-send-requested.v1` | notification fanout | notification fanout (stage 2) |
| `AI_QUIZ_GENERATION_REQUESTED` | `quiz.ai.quiz-generation-requested.v1` | catalog (direct) | catalog ai-worker |
| `AI_QUIZ_GENERATION_COMPLETED` | `quiz.ai.quiz-generation-completed.v1` | catalog ai-worker | — (poll `GET /v1/ai/quiz-generations/:jobId`) |
| `EXPORT_REQUESTED` | `quiz.analytics.export-requested.v1` | analytics (direct) | analytics export-worker |
| `EXPORT_COMPLETED` | `quiz.analytics.export-completed.v1` | analytics export-worker | — |

Note the AI topics use the `quiz.ai.*` domain even though catalog owns them.

### 15.2 Envelope — every message, no exceptions

```ts
interface EventEnvelope<T> {
  eventId: string       // randomUUID — THE consumer dedupe key
  eventType: string
  eventVersion: number  // default 1
  occurredAt: string    // ISO
  producer: string      // "assessment-svc@1.4.0"
  traceId?: string      // propagated x-trace-id
  data: T
}
```
Built with `createEnvelope(eventType, data, { producer, eventVersion?, traceId? })`.

### 15.3 Keying and retention rationale (from `ARCHITECTURE.md` — know this before changing a key)

- **`attempt-submitted` keyed by `userId`, not `quizId`.** Per-user causal ordering makes
  `last_attempt_at`, streaks and the `last20_scores` ring buffer monotonic without extra guards,
  and all upserts for one user serialize onto one partition. Keying by `quizId` would hot-spot one
  popular mock test onto a single partition.
- **`attempt-submitted` is not compacted.** It is a *fact*, not entity state; compaction would
  destroy every earlier attempt by that user and break replay-to-rebuild.
- **`*-changed` topics are compacted** — entity state with upsert semantics. The payoff: a
  brand-new analytics-svc with an empty DB bootstraps `dim_quiz` by reading from offset 0. Deletes
  emit a **tombstone** (null payload — `publishOutboxBatch` supports this).
- **No question bodies and no answer keys on the bus, ever.**
- **Push is two-stage** (§12.2). Stage-two payloads carry `subscriptionId` — **never**
  `endpoint`/`p256dh`/`auth`, which are encryption secrets.
- **`ai-generation-requested` keyed by `jobId`**, not `requestedBy` — no ordering requirement, and
  keying by user would serialize one admin's five jobs.
- **Long handlers must raise `maxPollIntervalMs`** (ai-worker and export-worker both use 15 min):
  a consumer that exceeds its poll interval is evicted, rebalanced, and **the job runs twice**.
- **No `attempt-expired` topic** — one state transition, one topic, one `submitSource` discriminator.

### 15.4 Transactional outbox — where and why

**Use the outbox when a DB write and an event must be atomic:** `ATTEMPT_SUBMITTED`,
`QUIZ_CHANGED`, `USER_CHANGED`, `ANNOUNCEMENT_PUBLISHED`. **Publish directly when no state is
committed alongside:** `EXPORT_REQUESTED`, `AI_QUIZ_GENERATION_REQUESTED`, `SUBJECT_CHANGED`,
`CHAPTER_CHANGED`, announcement repush.

Mechanism: each of identity/catalog/assessment/notification has an `Outbox` model + a
`src/outbox-store.ts` implementing `withClaimedBatch` (`FOR UPDATE SKIP LOCKED` claim, send,
`markPublished` — all inside one transaction) and runs `startOutboxPublisher` every **2 s**
(in-process for identity and catalog/notification services; in the worker for assessment).
analytics has **no** outbox (it owns no authoritative data).

### 15.5 Consumer idempotency

Every consumer must be idempotent on `envelope.eventId`. Two patterns exist in the tree:

| Pattern | Where | Verdict |
|---|---|---|
| `hasProcessed` pre-check **+ `markProcessed(tx, eventId)` in the same transaction** as the projection | `apps/analytics/src/rollup-consumer.ts` | **Correct — copy this** |
| best-effort `markProcessed(...).catch(() => null)` outside a transaction | `apps/notification/src/fanout-worker.ts` | weaker; acceptable for idempotent sends |
| `hasProcessed` stub returning `false` | `apps/catalog/src/ai-worker.ts` | **broken; a known gap** |

---

## 16 — Redis — keys, rate limits, leaderboards, SSE

One instance. Logical separation by **key prefix, never DB index** (`SELECT` is unsupported on
Upstash/Cluster). Global prefix `q:`. **Every key is built in
`packages/redis-kit/src/keys.ts` and nowhere else** — if you need a new key, add a builder.

### 16.1 Key builders (21)

| Builder | Pattern | Purpose / TTL |
|---|---|---|
| `tokenCache(token)` | `q:auth:token:<token>` | gateway introspection cache, **120 s** (not a session store) |
| `attempt(id)` | `q:att:<id>` | in-flight attempt hash (planned use) |
| `attemptAnswers(id)` | `q:att:<id>:ans` | in-flight answers hash |
| `attemptResumeLookup(u,q)` | `q:att:user:<userId>:<quizId>` | resume lookup |
| `attemptDirtySet()` | `q:att:dirty` | write-behind ZSET (planned) |
| `leaderboardQuiz(id)` | `q:lb:quiz:<id>` | ZSET |
| `leaderboardSubject(id)` | `q:lb:subject:<id>` | ZSET |
| `leaderboardGlobal()` | `q:lb:global` | ZSET |
| `leaderboardWeekly(isoWeek)` | `q:lb:weekly:<YYYY-Www>` | ZSET, **EXPIRE 9 days** |
| `leaderboardNames()` | `q:lb:names` | HASH userId→name |
| `cacheAnalyticsOverview()` | `q:cache:analytics:overview` | 300 s |
| `cacheAnalyticsQuiz(id)` | `q:cache:analytics:quiz:<id>` | busted by rollup |
| `cacheAnalyticsUser(id)` | `q:cache:analytics:user:<id>` | busted by rollup |
| `cacheLock(name)` | `q:lock:<name>` | single-flight |
| `rateLimit(policy,subject,windowStart)` | `q:rl:<policy>:<subject>:<windowStart>` | 2× window |
| `idempotency(route,userId,key)` | `q:idem:<route>:<userId>:<key>` | 24 h |
| `pubsubUser(userId)` | `q:pubsub:user:<userId>` | SSE per-user channel |
| `pubsubBroadcast()` | `q:pubsub:broadcast` | SSE broadcast channel |
| `sseTicket(t)` | `q:sse:ticket:<t>` | **30 s, consumed with `GETDEL`** |
| `sseBacklog(userId)` | `q:sse:backlog:<userId>` | capped 50, 1 h TTL |
| `sweeperLock(shard)` | `q:lock:sweeper:<shard>` | best-effort only |

**`KEYS *` must never run.** No lock in this design protects correctness (submit is a Postgres CAS;
the outbox uses `SKIP LOCKED`), which is why Redlock is deliberately absent.

**What must never live only in Redis:** submitted attempts, scores, post-submit answers, users,
quizzes, question bank, announcements, or answer keys. A total Redis loss must be an
inconvenience, not data loss (it does log everyone out — accepted).

### 16.2 Rate-limit policies — `RATE_LIMIT_POLICIES` (implemented values)

Algorithm: approximate sliding window via **two weighted fixed-window counters in one Lua script**
(two `INCR`s, O(1) memory, ≤~5 % boundary error, explainable at 1 am). Sliding-window *log* and
token bucket/GCRA were both considered and rejected.

| Key | `name` | Limit | Window | Applied at |
|---|---|---|---|---|
| `defaultByIp` | `default:ip` | 600 | 60 s | every non-health request |
| `defaultByUser` | `default:user` | 300 | 60 s | every authenticated request |
| `loginByIp` | `login:ip` | 50 | 5 min | `POST /v1/auth/login` |
| `loginByEmail` | `login:email` | 30 | 15 min | `POST /v1/auth/login` (subject = `body.email`) |
| `signupByIp` | `signup:ip` | 3 | 60 min | `POST /v1/auth/signup` |
| `aiGenByUser` | `ai-gen:user` | 5 | 60 min | `POST /v1/ai/quiz-generations` — Gemini costs money |
| `exportByUser` | `export:user` | 3 | 60 min | `POST /v1/admin/exports` — each is a table scan |
| `answersByAttempt` | `answers:attempt` | 120 | 60 s | `PATCH /v1/attempts/:id/answers` — autosave is chatty *by design*; this is an abuse ceiling |
| `submitByAttempt` | `submit:attempt` | 5 | 60 s | `POST /v1/attempts/:id/submit` |

⚠️ These differ from the table in `ARCHITECTURE.md` (which says `login:ip` 10/5 min, `login:email`
5/15 min and lists no `submit:attempt`). **The code is authoritative.**

### 16.3 Leaderboards

Member = `userId`. Composite integer score so ties break by speed:

```
score = round(scorePct × 100) × 1_000_000 + (999_999 − min(timeSpentSec, 999_999))
// max ≈ 1.0e13, well inside float64's exact-integer range (2^53 ≈ 9.0e15)
// decode: pct = floor(s / 1e6) / 100 ; secs = 999_999 − (s mod 1e6)
```

`recordLeaderboardEntry` issues one pipeline: `ZADD … GT CH` to quiz + global + weekly
(+ subject when known), `HSET q:lb:names`, `EXPIRE` weekly to 9 days.
**The `GT` flag is the entire "best attempt counts" rule** — no read-then-write, no race.
Weekly rotation is implicit in the key (`isoWeek()`), so there is no cron and no empty window.
`getLeaderboard` = `ZREVRANGE … WITHSCORES` + `HGETALL` names, `"Unknown"` fallback.

Leaderboards are safe in Redis **because** they are rebuildable from `AttemptFact`. Ranks are only
trustworthy because scores are server-computed.

---

## 17 — End-to-end request traces

Follow these when debugging (skill: `distributed-debugging`). Every hop carries `x-trace-id`.

### 17.1 Login

```
UI  app/auth/login/page.tsx  → POST /api/auth/login
web app/api/auth/login/route.ts → proxyToGateway(req, "/v1/auth/login")
gw  public route → rate limits login:ip + login:email → proxy identity:4001
id  loginRequestSchema → find user → PLAINTEXT compare → userType/isAdmin cross-check
    → tx { update lastLogin ; insert Outbox USER_CHANGED } → { token, user }
id  outbox publisher (2 s) → quiz.identity.user-changed.v1
    → analytics rollup upserts DimUser ; notification fanout upserts UserRef
```

### 17.2 Take a quiz (the critical path)

```
POST /api/attempts → gw (auth, default limits) → assessment POST /v1/attempts
  assessment → catalog GET /internal/quizzes/:id/full     ← the ONLY sync cross-service call
  → upsert AttemptSnapshot on (quizId, contentHash)
  → insert Attempt (startedAt, expiresAt = server clock; partial unique index blocks a 2nd in-flight)
  → 201 { attemptId, serverTime, remainingMs, questions WITHOUT correctAnswer, savedAnswers }
  → Outbox ATTEMPT_STARTED

PATCH /api/attempts/:id/answers   (autosave, repeatedly; limit answers:attempt 120/min)
  → 409 if not IN_PROGRESS or expired ; clientSeq resolves multi-tab last-write-wins
  → { saved: n }

POST /api/attempts/:id/submit     (limit submit:attempt 5/min)
  → CAS: UPDATE ... WHERE status='IN_PROGRESS'   (0 rows ⇒ replay stored result)
  → scoreQuiz() from the SNAPSHOT (never from client input)
  → write scores/counts ; Outbox ATTEMPT_SUBMITTED (submitSource='user')

GET /api/attempts/:id/result → 409 unless SUBMITTED → now reveals correct answers + explanations

assessment-worker outbox (2 s) → quiz.assessment.attempt-submitted.v1 (key=userId)
  → analytics rollup: AttemptFact + AttemptSectionFact + QuestionStat + QuizUserSeen
    + QuizStats + UserStats(+streaks) + UserDailyActivity + 3 DailyRollup rows
    [markProcessed in the SAME tx]
  → then outside tx: recordLeaderboardEntry (ZADD GT) + DEL 3 analytics cache keys
```

If the student never submits: `assessment-worker`'s sweeper (every 15 s, batch 100) calls the same
`submitAttempt` with `submitSource='sweeper'` once `expiresAt` passes.

### 17.3 Publish an announcement → push + SSE

```
POST /api/admin/announcements → gw → notification POST /v1/admin/announcements
  → ONE tx { insert Announcement ; insert Outbox ANNOUNCEMENT_PUBLISHED }  ← returns fast
outbox (2 s) → quiz.notification.announcement-published.v1
notification-worker:
  ① publishBroadcast(redis, "announcement", …) → q:pubsub:broadcast → every open SSE stream
  ② keyset-page PushSubscription where isActive (100/page)
     → sendBatch one PUSH_SEND_REQUESTED per subscription (key=userId, carries subscriptionId only)
  ③ PUSH_SEND_REQUESTED → sendPushToSubscription → web-push
     → HTTP 410 ⇒ isActive:false, NOT an error
Browser: GET /api/announcements (list) ; POST /api/announcements/:id (mark read)
SSE:     POST /v1/stream/tickets (30 s) → GET /v1/stream?ticket=… (GETDEL, 15 s heartbeat)
```

### 17.4 AI quiz generation

```
POST /api/ai/generate-quiz → gw (limit ai-gen:user 5/h) → catalog POST /v1/ai/quiz-generations
  → insert AiGenerationJob(pending) → direct produce AI_QUIZ_GENERATION_REQUESTED → 202 { jobId }
catalog-ai-worker (maxPollIntervalMs 15 min):
  per section → Gemini gemini-1.5-flash → parse → append to partialQuestions AND SAVE
  → status succeeded | partial | failed
  → if any questions: create Quiz(isActive = succeeded)   ← partial ⇒ inactive draft
  → produce AI_QUIZ_GENERATION_COMPLETED
UI polls GET /api/ai/generate-quiz/[jobId]
```

### 17.5 CSV export

```
POST /api/admin/... → gw (limit export:user 3/h) → analytics POST /v1/admin/exports
  → insert ExportJob(pending) → direct produce EXPORT_REQUESTED → 202 { jobId }
analytics-export-worker (maxPollIntervalMs 15 min):
  keyset-paginated generator (PAGE_SIZE 500) → Readable.from → lib-storage multipart Upload
  → s3://quiz-exports/<kind>/<jobId>.csv  → ExportJob done(objectKey, rowCount)
  → produce EXPORT_COMPLETED
GET /v1/admin/exports/:id → presigned downloadUrl (24 h)
```

---

## 18 — Environment variables — complete reference

Three distinct env surfaces — **do not confuse them**:

| Surface | File | Who reads it |
|---|---|---|
| Repo root | `.env`, `.env.local`, `.env.example` | **only `apps/web` when run outside Docker** (`pnpm --filter web dev`) and ad-hoc local tooling |
| Compose | **`infra/.env`** (next to the compose file — Compose's project dir) | `infra/docker-compose.yml` variable substitution |
| Container | inlined per-service in `infra/docker-compose.yml` | each service's `process.env` |

A service **never** reads `IDENTITY_RW_PASSWORD` etc. directly — Compose substitutes those into the
assembled `DATABASE_URL`/`S3_*` values first.

### 18.1 Per-service variables (what the code reads)

| Service | Variable | Required | Default / note |
|---|---|---|---|
| gateway | `PORT` | no | 4000 |
| gateway | `REDIS_URL` | yes | introspection cache + rate limiting |
| gateway | `IDENTITY_SVC_URL`, `CATALOG_SVC_URL`, `ASSESSMENT_SVC_URL`, `ANALYTICS_SVC_URL`, `NOTIFICATION_SVC_URL` | yes | proxy targets; defaults `http://localhost:400{1..5}` |
| identity | `PORT` / `DATABASE_URL` / `KAFKA_BROKERS` | 4001 / yes / yes | role `identity_rw`, schema `identity` |
| catalog (+ai-worker) | `PORT` / `DATABASE_URL` / `KAFKA_BROKERS` | 4002 / yes / yes | role `catalog_rw` |
| catalog (+ai-worker) | `GEMINI_API_KEY` | no | missing ⇒ job status `failed`, no crash |
| assessment (+worker) | `PORT` / `DATABASE_URL` / `KAFKA_BROKERS` | 4003 / yes / yes | role `assessment_rw` |
| assessment (+worker) | `CATALOG_SVC_URL`, `IDENTITY_SVC_URL` | yes | snapshot at attempt start + legacy enrichment |
| assessment-worker | `SWEEP_INTERVAL_MS`, `SWEEP_BATCH_SIZE` | no | 15000 / 100 |
| analytics (all 3) | `PORT` / `DATABASE_URL` / `KAFKA_BROKERS` / `REDIS_URL` | 4004 / yes / yes / yes | role `analytics_rw` |
| analytics (+export-worker) | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `EXPORT_BUCKET` | for exports | MinIO locally; omit `S3_ENDPOINT` for real AWS |
| notification (+worker) | `PORT` / `DATABASE_URL` / `KAFKA_BROKERS` / `REDIS_URL` | 4005 / yes / yes / yes | role `notification_rw` |
|notification (+worker)|`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`|no|all three required; missing ⇒ push no-op with a warning|
|web|`GATEWAY_URL`|**yes**|server-side, read per request by every `app/api/**` handler|
|web|`GEMINI_API_KEY`|no|the two direct-Gemini routes only|
|web|`NEXT_PUBLIC_VAPID_PUBLIC_KEY`|for push|must match notification `VAPID_PUBLIC_KEY`; embedded at web build time|
| all backend | `LOG_LEVEL`, `NODE_ENV` | no | `info`; non-production enables `pino-pretty` |

Package-level defaults if unset: `KAFKA_BROKERS` → `localhost:19092`, `REDIS_URL` →
`redis://localhost:6380`. Inside Compose they are always explicit (`redpanda:9092`,
`redis://redis:6379`).

### 18.2 `infra/.env` override vars (12)

`POSTGRES_ADMIN_PASSWORD` · `IDENTITY_RW_PASSWORD` · `CATALOG_RW_PASSWORD` ·
`ASSESSMENT_RW_PASSWORD` · `ANALYTICS_RW_PASSWORD` · `NOTIFICATION_RW_PASSWORD` ·
`MINIO_ROOT_USER` · `MINIO_ROOT_PASSWORD` · `GEMINI_API_KEY` · `VAPID_PUBLIC_KEY` ·
`VAPID_PRIVATE_KEY` · `VAPID_EMAIL`.

Every one has a dev default baked into `docker-compose.yml`
(`${IDENTITY_RW_PASSWORD:-identity_rw_pw}` etc.), so a bare `pnpm compose:up` works with an empty
`infra/.env` — which is exactly its current state. Generate a secret with
`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`;
generate VAPID keys with `npx web-push generate-vapid-keys`.

**Changing `infra/.env` on a deployed VM is the only change CI cannot ship** — it is gitignored, so
edit it on the box and re-run the deploy workflow manually.

### 18.3 Local connection strings (host side, Docker running)

```
postgresql://identity_rw:identity_rw_pw@localhost:5433/quiz?schema=identity
postgresql://catalog_rw:catalog_rw_pw@localhost:5433/quiz?schema=catalog
postgresql://assessment_rw:assessment_rw_pw@localhost:5433/quiz?schema=assessment
postgresql://analytics_rw:analytics_rw_pw@localhost:5433/quiz?schema=analytics
postgresql://notification_rw:notification_rw_pw@localhost:5433/quiz?schema=notification
redis://localhost:6380      KAFKA_BROKERS=localhost:19092      S3 http://localhost:9000
```

---

## 19 — Invariants, known gaps, footguns, doc-vs-code discrepancies

### 19.1 Hard invariants — breaking any of these is a defect, not a trade-off

1. **Answer keys never leave catalog except via `/internal/quizzes/:id/full`.**
   `GET /v1/quizzes/:id` returns metadata only; `AttemptQuestionDTO` has no `correctAnswer`;
   the result route requires `SUBMITTED`. Never put keys on Kafka.
2. **Scoring is server-side only**, from the snapshot, in `apps/assessment/src/lib/scoring.ts`.
   Never reintroduce client scoring or accept a client-supplied score.
3. **The gateway strips inbound `x-user-*` headers.** Never trust those headers on a path that can
   be reached without passing through the gateway, and never register an `/internal/*` prefix.
4. **Submit idempotency is a Postgres CAS.** Never move it to Redis.
5. **No cross-schema SQL, no cross-schema FK.** Roles make it fail loudly; keep it that way.
6. **No service calls another on a request hot path** (the three sanctioned internal endpoints are
   snapshot-at-start, introspection, and legacy enrichment).
7. **Every Redis key comes from `packages/redis-kit/src/keys.ts`.** No inline template strings.
8. **Every Kafka message uses `createEnvelope`** and every consumer is idempotent on `eventId`.
9. **`apps/web` has no database access.** Its only egress is `proxyToGateway`.
10. **`USER_CHANGED` never backfills historical attempts** (frozen `userName`/`userEmail`).
11. **`prisma migrate deploy` in any environment with data**, never `migrate dev`.
12. **Scoring fixture changes require an explicit reason** in the same commit.

### 19.2 Known gaps — real, documented, do not "discover" them again

From `HOSTING.md` Part 7 plus verification against the tree:

| # | Gap | Detail |
|---|---|---|
| 1 | **Plaintext passwords** | stored and compared as plaintext in identity's login route. Explicit decision; `ARCHITECTURE.md` Phase 2 has the argon2id migration plan |
| 2 | **Opaque unsigned tokens, no revocation** | `${userId}-${ts}-${rand}`, 30-day max age. No JWT/RS256/JWKS/refresh/denylist exists |
| 3 | `app/goals/page.tsx` | goal history is `localStorage`-only, never server-persisted |
| 4 | **AI job loses `chapterId`/`duration`/`negativeMarking`** | `AiGenerationJob` only stores title/sections/difficulty/questionsPerSection; needs a schema addition |
| 5 | **Legacy reporting routes** | `apps/assessment/src/legacy.ts` still reads `QuizResult` and enriches over HTTP instead of using analytics' `AttemptFact`/`UserStats`/`QuizStats` |
| 6 | **No OTel / Prometheus / Grafana / Jaeger** | only `x-trace-id` + pino. Deliberately not scaffolded with decorative containers |
| 7 | Two web routes call Gemini directly | `ai/generate-questions`, `generate-flashcards` — stateless, deliberate scope boundary |
| 8 | **No compiled build for services** | everything runs under `tsx`, including in Docker "production" images |
| 9 | **Playwright specs are stale AND misconfigured** | `playwright.config.ts` sets `testDir: "./tests/e2e"` but the specs live in `apps/web/tests-e2e/`; `global-setup.ts` runs `npx tsx prisma/seed.ts` while `apps/web` has no `prisma/` dir. `pnpm test:e2e` cannot pass as-is. Specs also predate the gateway flow |
| 10 | **No DLQ anywhere** | `ARCHITECTURE.md` specifies `<topic>.dlq.v1` + `POST /v1/admin/dlq/replay`; `consumer.ts` logs "sending to DLQ path" and then **drops the message** |
| 11 | **`runConsumer`'s `maxPollIntervalMs` is never applied** to the kafkajs consumer — a real bug for the very long handlers whose comments warn about it |
| 12 | **catalog ai-worker `hasProcessed` is a stub** returning `false` — no consumer dedupe there |
| 13 | **`assessment-svc db:seed` points at a nonexistent `prisma/seed.ts`** |
| 14 | **No lint for the 6 backend apps** (`lint` is an `echo`); only `web` has ESLint. `packages/*` have only `typecheck` |
| 15 | **No `vitest.config.ts` anywhere** — the one suite runs on defaults |
| 16 | **Committed secrets** | `infra/docker-compose.yml` has a real VAPID **private** key + a personal email as defaults; `docs/next-steps-push-notifications.md` contains a *different* real VAPID pair. Rotate both, move to `infra/.env`, scrub the doc |
| 17 | Redis attempt cache / write-behind flusher | keys exist in `keys.ts` but the flusher from `ARCHITECTURE.md` is not implemented — autosave writes straight to Postgres |
| 18 | analytics overview has no single-flight lock | two cold requests may both compute (documented, accepted) |

### 19.3 Doc-vs-code discrepancies — trust the code

| Doc says | Reality |
|---|---|
| `ARCHITECTURE.md`: RS256 JWT, JWKS, refresh rotation, argon2id, `packages/auth-kit`, `middleware.ts` | none exist; opaque tokens + plaintext passwords |
| `ARCHITECTURE.md`: `packages/config-eslint`, `config-ts` | do not exist; each package extends `tsconfig.base.json` |
| `ARCHITECTURE.md`: `packages/kafka-kit/src/{producer,envelope,dlq}.ts` | producer helpers are in `client.ts`, envelope is in contracts, DLQ does not exist |
| `ARCHITECTURE.md`: observability = "pino, OTel init" | pino only |
| `ARCHITECTURE.md`: `infra/postgres/init/01-schemas-roles.sql`, `docker-compose.obs.yml`, `grafana/`, `prometheus/` | the init file is `01-schemas-roles.sh`; the rest do not exist |
| `ARCHITECTURE.md`: rate-limit table (`login:ip` 10/5m …) | `RATE_LIMIT_POLICIES` uses different numbers (§16.2) |
| `ARCHITECTURE.md`: Phases 0–10, "the bottleneck is the code", file:line audit of `app/api/**` | describes the **pre-split monolith**; those paths no longer exist |
| `DEPLOYMENT.md` / `HOSTING.md`: workflow `deploy-oracle.yml`, secrets `ORACLE_HOST`/`ORACLE_USER`/`ORACLE_SSH_KEY`, user `opc` | the real workflow is `.github/workflows/deploy-ec2.yml`, secrets `EC2_HOST`/`EC2_SSH_KEY`, SSH user `ubuntu` |
| `HOSTING.md`: `pnpm db:seed` at the root | root script is `db:seed:identity`; seeds are per-service inside containers |
| `README.md`: `LICENSE` file | not present in the tree |
| `docs/*push*`: `npx prisma migrate dev`, monolith `lib/` paths | pre-split; use per-service `db:migrate` |
| `infra/docker-compose.prod.yml` header: "rebinds every port to 127.0.0.1" | it **removes** the mappings entirely (stronger) |

### 19.4 Footguns

- **Compose init scripts run only on a fresh volume.** Schema/role errors after changing
  `01-schemas-roles.sh` need `down -v`.
- **`pnpm db:generate` before anything.** A missing generated client produces a confusing wall of
  type errors.
- **Redpanda memory.** `--memory=512M` is tight; the EC2 deploy `sed`s it to **200M** on the box.
  On Windows, cap `vmmem` in `%UserProfile%\.wslconfig` before the first `compose up`.
- **Ports 5433/6380 (not 5432/6379)** when connecting from the host.
- **Next.js 15 async params:** route handlers/pages must use
  `props: { params: Promise<{ id: string }> }` + `await props.params`. Codemod:
  `npx @next/codemod@canary next-async-request-api .`
- **`.gitignore` script globs** (`test-*.js`, `seed-*.js`, `setup-*.js`, `check-*.js`,
  `debug-*.js`) will silently untrack a new root-level script. Verify with `git status` /
  `git check-ignore -v <file>`.
- **`.vscode/` is gitignored** — editor config is not shared.
- **Stopping a Dockerized service before running it locally** is required, or you fight for the port.
- **Long Kafka handlers** must raise `maxPollIntervalMs` *and* be aware it is currently ignored by
  `runConsumer` (gap #11) — pass it to `kafka.consumer()` directly if it matters.
- **`turbo` caches `prisma:generate`** keyed on `prisma/schema.prisma`; if generation output looks
  stale, that is why.

---

## 20 — Testing, CI, and deployment

### 20.1 Test inventory (small — be honest about it)

| Suite | Path | Runner | State |
|---|---|---|---|
| Scoring golden fixtures (26 cases) | `apps/assessment/tests/scoring.test.ts` | vitest (`pnpm --filter assessment-svc test`) | ✅ the only real suite; the safety net for scoring |
| Quiz flow e2e | `apps/web/tests-e2e/quiz-flow.spec.ts` | Playwright | ⚠️ stale + misconfigured (gap #9) |
| Admin edit propagation e2e | `apps/web/tests-e2e/admin-edit-flow.spec.ts` | Playwright | ⚠️ same |
| Global setup | `apps/web/tests-e2e/global-setup.ts` | — | ⚠️ seeds a nonexistent `prisma/` |

`playwright.config.ts`: `PORT` default 3100, `fullyParallel: false`, `workers: 1`,
`retries: CI?1:0`, single chromium project, `trace: on-first-retry`,
`webServer: CI ? next start : next dev`, `reuseExistingServer: !CI`, 120 s timeout.

**Verification ladder for any change** (skill: `testing-and-quality`):

```bash
pnpm db:generate && pnpm typecheck        # always
pnpm --filter assessment-svc test         # if scoring/attempts touched
pnpm --filter web lint                    # if web touched
pnpm compose:up && pnpm compose:logs      # if a service/worker/infra touched
# then the manual smoke: login → take quiz → submit → see score → admin edit → student sees it
```

Event-path changes are verified in **Redpanda Console** (http://localhost:8090): the topic has the
record, the consumer group has no lag, and the projection row exists in Postgres. Export changes are
verified in **MinIO Console** (bucket `quiz-exports`).

### 20.2 CI — `.github/workflows/ci.yml`

Triggers: push to `main`, and all pull requests. Single job `lint-typecheck-unit` on
`ubuntu-latest`. Workflow env sets a dummy `DATABASE_URL` (only needs to *exist* for Prisma
generate/validate; no live Postgres in CI).

```
checkout → pnpm/action-setup@v4 (version from packageManager) → setup-node@v4 (22, cache: pnpm)
→ pnpm install --frozen-lockfile
→ pnpm db:generate
→ pnpm typecheck
→ pnpm lint
→ pnpm test
→ pnpm --filter web build     ← a real Next production build, not just tsc
```

**There is no e2e job**, deliberately (stale specs + the cost of standing up 11 processes).

### 20.3 Deploy — `.github/workflows/deploy-ec2.yml`

Name **"Deploy Backend Stack to EC2"**. Triggers: push to `main` filtered to
`apps/{gateway,identity,catalog,assessment,analytics,notification}/**`, `packages/**`, `infra/**`,
and the workflow file itself — **`apps/web/**` is excluded because web deploys via Vercel** — plus
`workflow_dispatch`. Secrets: `EC2_HOST`, `EC2_SSH_KEY`.

Remote sequence (via `appleboy/ssh-action@v1.2.0`, user `ubuntu`, 30 min timeout):

1. Find the checkout: `$HOME/quiz-platform` → `quiz-repo-microservice` → `quiz-repo`, else clone.
2. `git fetch origin main && git reset --hard origin/main`.
3. `docker image prune -f`; `docker builder prune -f --keep-storage 1GB`.
4. `sed -i 's/--memory=512M/--memory=200M/' infra/docker-compose.yml` (low-RAM box).
5. `COMPOSE_PARALLEL_LIMIT=1`, then **build the 11 services one at a time** (so each app's worker
   build is a 100 % BuildKit cache hit off the shared `base` stage and no two `pnpm install`s
   contend on the pnpm cache mount).
6. `docker container prune -f || true`.
7. One `up -d --remove-orphans` with base + prod overlay for infra + the 11 processes + `caddy`
   (**`web` and `redpanda-console` are intentionally not started**).
8. `docker image prune -f`; `sleep 10`.
9. `db:migrate` for all five services, then `db:seed` for identity and catalog (each `|| true`).

Frontend: Vercel's own GitHub integration, **Root Directory `apps/web`**, env `GATEWAY_URL` set for
Production + Preview. Nothing in this repo's workflows controls it.

Reverse proxy: `infra/Caddyfile` — one site block for `16-170-103-71.sslip.io` →
`reverse_proxy gateway:4000`. It fronts the **gateway, not web**, because web lives on Vercel and
its route handlers call the gateway server-to-server (so no CORS config is needed). Replace the
`sslip.io` host with a real API domain when you have one.

Backups: `.github/workflows/db-backup.yml`, daily 02:00 UTC + manual. SSHes in,
`docker exec quiz-platform-postgres-1 pg_dumpall -U quiz_admin | gzip`, uploads a 90-day artifact,
and optionally replays into Neon if `NEON_DATABASE_URL` is set.

### 20.4 Compose overlay behaviour

`infra/docker-compose.prod.yml` adds `caddy` (80/443, `Caddyfile` mounted read-only, `caddy-data`
and `caddy-config` volumes), adds a healthcheck to `web`, and **empties `ports: []`** for gateway,
all five services, postgres, redis, redpanda, redpanda-console and minio — so only Caddy (80/443)
and web (3000) publish host ports. To reach an internal console from your laptop, use an SSH
tunnel (`ORACLE_SETUP.md` ops cheat-sheet).

---

## 21 — Task routing cheat-sheet

| I need to… | Load skill | Read | Touch (in order) |
|---|---|---|---|
| Add a browser-reachable endpoint | `microservice-api-change` + `gateway-route-and-rate-limit` | §7, §9–§12 | service `src/index.ts` → gateway proxy table (+public rule/limit) → `apps/web/app/api/**` forwarder → UI |
| Change an API payload shape | `contracts-and-events` | §13.1 | `packages/contracts/src/dto/*` → producer → every consumer → UI types |
| Add or change a Kafka event | `contracts-and-events` | §15 | `contracts/src/events/topics.ts` → producer (outbox vs direct — §15.4) → consumer + idempotency → verify in Redpanda Console |
| Change a DB model | `prisma-database-change` | §14 | one service's `prisma/schema.prisma` → migration (hand-write partial indexes) → `pnpm db:generate` → queries → `db:migrate` in container |
| Touch attempts/timers/scoring | `quiz-attempt-lifecycle` | §10, §17.2 | `attempt-service.ts` / `lib/scoring.ts` / `attempt-result.ts` → **update `tests/scoring.test.ts`** |
| Quiz/subject/chapter/question-bank CRUD | `quiz-content-management` | §9 | `apps/catalog/src/index.ts` (+ `lib/database-utils.ts` for JSON columns) → `*_CHANGED` event → admin UI |
| AI generation | `ai-quiz-generation` | §9.2, §17.4 | `apps/catalog/src/ai-worker.ts` (+ `AiGenerationJob` schema for gap #4) |
| Dashboards, stats, streaks | `analytics-rollups` | §11.3 | `rollup-consumer.ts` (in-tx `markProcessed`) → `analytics/src/index.ts` → cache busting |
| Leaderboards | `leaderboard-consistency` | §16.3 | `packages/redis-kit/src/leaderboard.ts` → `rollup-consumer.ts` → `GET /v1/leaderboards/:scope` |
| CSV export | `csv-export-pipeline` | §11.4, §17.5 | `export-worker.ts` (keep the streaming generator) → `csv.ts` → `object-store.ts` |
| Announcements, SSE, push | `notifications-realtime-push` | §12, §17.3 | `notification/src/{index,fanout-worker,push,sse}.ts` → `public/sw.js` → `hooks/use-push-notifications.tsx` |
| Service worker / PWA / offline | `pwa-service-worker` | §6.4 | `apps/web/public/sw.js`, `app/manifest.ts`, `components/service-worker-registration.tsx`, `pwa-handler.tsx` |
| Any UI work | `frontend-feature` | §6 | `app/**/page.tsx` → `components/**` → `app/api/**` forwarder if new data is needed |
| Auth, roles, sessions | `authentication-and-sessions` | §7.2, §8 | `identity/src/index.ts` → `gateway/src/auth.ts` → `hooks/use-auth.tsx` → `components/protected-route.tsx` |
| Rate limits / caching | `gateway-route-and-rate-limit` | §16.1–16.2 | `packages/redis-kit/src/{keys,rateLimit}.ts` → `gateway/src/rate-limit.ts` |
| Debug a cross-service bug | `distributed-debugging` | §17, §19.4 | follow `x-trace-id` in pino logs → Redpanda Console (lag/DLQ) → psql per role → `docker compose logs <svc>` |
| Security pass | `security-review` | §19.1–19.2 | keys exposure, `x-user-*` scrubbing, `/internal/*`, `.env*` tracking, committed VAPID keys, limits |
| Docker/CI/deploy | `infrastructure-and-deployment` | §20, §14.1 | `infra/docker-compose*.yml`, `infra/Caddyfile`, `.github/workflows/*` |
| Write or fix tests | `testing-and-quality` | §20.1 | `apps/assessment/tests/*` · `apps/web/tests-e2e/*` (fix `testDir` first) |

**"Where does X live?" quick answers:** answer keys → `apps/catalog` only · scoring →
`apps/assessment/src/lib/scoring.ts` · every Redis key → `packages/redis-kit/src/keys.ts` · every
topic → `packages/contracts/src/events/topics.ts` · every DTO →
`packages/contracts/src/dto/*` · the only web→backend call →
`apps/web/lib/gateway-client.ts` · the proxy table → `apps/gateway/src/index.ts` · schemas/roles →
`infra/postgres/init/01-schemas-roles.sh`.

---

## 22 — Conventions and house rules

**Code**

- TypeScript strict, ESM. Backend relative imports use the `.js` extension convention.
- Fastify handlers: validate with a Zod schema from `@quiz/contracts`; map domain errors through the
  service's `handleServiceError`-style helper; return the documented status codes (400 validation,
  401 unauthenticated, 403 wrong role/owner, 404 missing, **409 conflict/optimistic-concurrency/
  wrong state**, 503 upstream unavailable).
- Every service registers `GET /healthz` (static) and `GET /readyz` (`SELECT 1`), plus the
  `TRACE_HEADER` `onRequest` hook. Keep both — Compose `depends_on: service_healthy` relies on them.
- Auth inside a service = trust `x-user-*` via that service's `auth.ts` (`requireUser` /
  `requireAdmin` / `getUser`). Never parse a bearer token outside identity/gateway.
- Structured logging via `createLogger(serviceName)`; include `traceId`. No `console.log` in services.
- New Redis key ⇒ add a builder. New event ⇒ add to `TOPICS` + a payload interface + an idempotent
  consumer. New cross-boundary payload ⇒ a Zod schema in contracts.
- Graceful shutdown: on `SIGTERM`/`SIGINT` stop the outbox/timers, disconnect producer + prisma,
  close the server (copy any existing service's block).

**Commits / PRs**

- Conventional-commit style is the repo norm: `feat(scope):`, `fix(deploy):`, `docs(skills):`,
  `chore(pi):`.
- Only commit when asked. Never commit `.env*` (other than `*.example`), generated Prisma clients,
  or a real key.
- Behaviour-changing merges should state the verification performed; deploy-affecting changes should
  state the revert path.

**Docs**

- Update the doc that owns the fact: ops → `HOSTING.md`; deploy checklist → `DEPLOYMENT.md`; VM
  provisioning → `ORACLE_SETUP.md`; rationale/plan → `ARCHITECTURE.md`; directory tour →
  `CODE_STRUCTURE.md`; stack → `TECH_STACK.md`; pitch/quick start → `README.md`.
- **If you change routes, ports, env vars, topics, Redis keys, models, or known gaps, update this
  file (§6–§19) in the same change**, and add newly discovered doc-vs-code drift to §19.3.
- Prefer editing an existing doc over adding a new one.

---

## 23 — Glossary

| Term | Meaning here |
|---|---|
| **Attempt** | The authoritative record of one student sitting one quiz: server clock, server score, snapshot reference, status machine (§10.3) |
| **AttemptSnapshot** | Immutable frozen copy of a quiz (questions + keys + marking config) taken at attempt start, deduped on `(quizId, contentHash)`; makes mid-exam edits harmless |
| **Legacy (`QuizResult`, `/v1/legacy-*`)** | Pre-split reporting data and routes in `apps/assessment/src/legacy.ts`. Read-mostly; new scores never write here |
| **Outbox** | A row written in the same transaction as a state change, published to Kafka 2 s later by a poller using `FOR UPDATE SKIP LOCKED`. Guarantees the event cannot be lost after the commit |
| **Direct produce** | Publishing without an outbox row — correct only when no local state is committed alongside |
| **Event-carried state transfer** | Services keep local read-only projections (`Dim*`, `UserRef`) fed by events instead of calling each other |
| **Projection / read model** | Derived, rebuildable tables in the `analytics` schema |
| **`processed_event` / `ProcessedEvent`** | Consumer-side dedupe table keyed on `eventId`; written in the same transaction as the projection |
| **Tombstone** | A null-payload Kafka record marking a deletion on a compacted topic |
| **CAS (compare-and-swap)** | `UPDATE … WHERE status='IN_PROGRESS'`; 0 rows affected means "already done" — the submit idempotency mechanism |
| **Sweeper** | `assessment-worker` loop that auto-submits attempts past `expiresAt` with `submitSource='sweeper'` |
| **Fanout (two-stage)** | One `ANNOUNCEMENT_PUBLISHED` record → paged `PUSH_SEND_REQUESTED` records, one per subscription |
| **SSE ticket** | Single-use 30 s Redis token consumed with `GETDEL`, because `EventSource` cannot send an `Authorization` header |
| **Introspection** | Gateway → identity `POST /v1/internal/introspect` token validation, Redis-cached 120 s |
| **`x-user-*` headers** | `x-user-id`/`-name`/`-email`/`-is-admin`, stripped from inbound requests and re-set by the gateway; the sole auth input for services |
| **Schema-per-service** | One Postgres database `quiz`, five schemas, five login roles with pinned `search_path` |
| **Keyset pagination** | Cursor-based paging (`cursor`/`nextCursor`) used for attempt history and the export generators; never `OFFSET` on large tables |
| **`GT` flag** | `ZADD … GT` — only raises a leaderboard score; the entire "best attempt counts" rule |
| **`p-value`** | Per-question difficulty = correct / attempts, computed in `QuestionStat` |
| **Claim-check** | Pattern for oversized payloads: emit `outcomesRef` instead of the inline array. Defined in the contracts, **no consumer implements it yet** |
| **Stop-here marker** | `ARCHITECTURE.md`'s point after Phase 6 where every real defect is fixed and the rest is architecture demonstration |

