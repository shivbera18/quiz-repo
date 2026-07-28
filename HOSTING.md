# Hosting Guide

How to run this app **locally** for development, and how to put it **online** for real users, as the codebase stands today — a single Next.js 14 app (App Router) with Prisma → PostgreSQL, no separate services yet.

> This document covers the system as it exists right now. For the longer-term plan to split this into services with Redis/Kafka/Docker Compose, see [ARCHITECTURE.md](ARCHITECTURE.md) — that's a future-state design, not what's described below.

## Contents

- [Prerequisites](#prerequisites)
- [Part 1 — Local development](#part-1--local-development)
- [Part 2 — Running the tests locally](#part-2--running-the-tests-locally)
- [Part 3 — Local production-mode run](#part-3--local-production-mode-run)
- [Part 4 — Hosting online (recommended: Vercel + Neon)](#part-4--hosting-online-recommended-vercel--neon)
- [Part 5 — Alternative hosting options](#part-5--alternative-hosting-options)
- [Part 6 — Environment variables reference](#part-6--environment-variables-reference)
- [Part 7 — Production database migrations](#part-7--production-database-migrations)
- [Part 8 — Post-deploy checklist and known gaps](#part-8--post-deploy-checklist-and-known-gaps)
- [Part 9 — Troubleshooting](#part-9--troubleshooting)

---

## Prerequisites

- **Node.js 20 or later** (this repo is developed and CI-tested against Node 22; anything ≥20 should work since nothing here uses bleeding-edge Node APIs)
- **pnpm** — the repo has a committed `pnpm-lock.yaml`, so use pnpm, not npm/yarn, or you'll get a divergent dependency tree
  ```bash
  npm install -g pnpm
  ```
- **A PostgreSQL database** — local install, Docker, or a free-tier managed instance (Neon is what this project already uses; Supabase/Railway/RDS all work identically since it's just Postgres)
- **A Google Gemini API key** (optional) — only needed for the AI quiz/question/flashcard generation features; get one free at https://aistudio.google.com/apikey

---

## Part 1 — Local development

### 1. Clone and install

```bash
git clone https://github.com/shivbera18/quiz-repo.git
cd quiz-repo
pnpm install
```

### 2. Get a database

Pick one:

**Option A — Neon free tier (no local install, matches what this project already uses)**
1. Create a free project at https://neon.tech
2. Copy the pooled connection string it gives you (it looks like `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`)

**Option B — Local Postgres**
```bash
# Docker, if you have it — no local Postgres install needed
docker run --name quiz-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=quizdb -p 5432:5432 -d postgres:16-alpine
```
Connection string: `postgresql://postgres:postgres@localhost:5432/quizdb`

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
- `DATABASE_URL` — the connection string from step 2
- `JWT_SECRET` — any long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `GEMINI_API_KEY` — optional, leave blank to skip AI features
- VAPID keys — optional, leave blank to skip push notifications (see [Known gaps](#part-8--post-deploy-checklist-and-known-gaps) — they're currently non-functional even when set)

Next.js loads `.env.local` automatically; it's already gitignored so you won't accidentally commit real secrets.

> **Heads-up if you also touch `prisma/seed.ts` or run `prisma` CLI commands directly:** the Prisma CLI and plain `tsx`/`node` scripts only auto-load **`.env`**, not `.env.local` (that's a Next.js-specific convention). If your `DATABASE_URL` only lives in `.env.local`, commands like `pnpm db:seed` or `npx prisma migrate dev` won't see it unless you either also create a `.env` with the same value, or pass it inline: `DATABASE_URL="..." pnpm db:seed`.

### 4. Set up the database schema

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies the existing migrations in `prisma/migrations/` as-is (this is also what you'd run against a fresh database in production — see [Part 7](#part-7--production-database-migrations)). Use `npx prisma migrate dev` instead only if you're actively changing `prisma/schema.prisma` and want Prisma to generate a new migration for you.

### 5. Seed sample data

```bash
DATABASE_URL="<your connection string>" pnpm db:seed
```

Creates:
- Admin: `admin@quizapp.com` / `admin123`
- Student: `student@test.com` / `student123`
- A sample quiz (`sample-quiz-001`, 2 questions, negative marking on)

Re-running this command is safe — it resets those three rows back to this baseline rather than erroring or duplicating them.

### 6. Run it

```bash
pnpm dev
```

Open http://localhost:3000. Log in with either seeded account from step 5.

---

## Part 2 — Running the tests locally

### Unit tests (no database needed)

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

Currently covers `lib/scoring.ts` (26 golden-fixture cases for the quiz-scoring formula).

### End-to-end tests (needs a real database)

```bash
npx playwright install chromium   # one-time, downloads a browser (~200MB)
DATABASE_URL="<your connection string>" pnpm test:e2e
```

This reseeds the database (same fixtures as [step 5](#5-seed-sample-data) above — so don't point it at a database you care about, it *will* mutate `sample-quiz-001`'s title mid-run and reset it after), starts a dev server on port 3100, and drives a real Chromium browser through:
- login → take the sample quiz → submit → see the score (including a negative-marking case)
- an admin renaming a quiz and a student seeing the new title

If a browser doesn't launch, or a port conflict shows up, see [Troubleshooting](#part-9--troubleshooting).

### CI

`.github/workflows/ci.yml` runs both suites on every push/PR — typecheck + lint + unit tests first, then the e2e suite against a `postgres:16-alpine` service container, with a `pnpm build` beforehand so e2e tests the actual production build (`next start`), not the dev server.

---

## Part 3 — Local production-mode run

To sanity-check what will actually run in production, without deploying anywhere:

```bash
pnpm build     # runs `prisma generate && next build`
pnpm start     # serves the production build on :3000
```

If `pnpm build` fails locally, it will also fail on whatever host you deploy to — fix it here first.

---

## Part 4 — Hosting online (recommended: Vercel + Neon)

This is the path the project's environment files (`.env.production`) and existing conventions already assume, and it's genuinely the least-friction option for a Next.js app: Vercel builds and serves the app, Neon hosts Postgres, both have usable free tiers.

### 1. Create the production database

1. Create a Neon project (or reuse an existing one, but **use a separate database/branch from your dev data** — don't point production at the same database you run tests against, since the e2e suite mutates seeded rows).
2. Copy the pooled connection string.
3. Apply migrations to it once, before the first deploy:
   ```bash
   DATABASE_URL="<production connection string>" npx prisma migrate deploy
   ```

### 2. Push the repo to GitHub

Vercel deploys from a Git repository. If you've been working locally, push your branch and open/merge a PR to `main` (or whichever branch you'll connect).

### 3. Import the project into Vercel

1. https://vercel.com/new → import the GitHub repo.
2. Framework preset: Vercel auto-detects Next.js — no changes needed.
3. Build command: leave as the default (it picks up `pnpm build` = `prisma generate && next build` from `package.json`). `prisma generate` runs on Vercel's own Linux build machines, so it produces the right binary for the deploy target automatically — you don't need to configure `binaryTargets` in `schema.prisma` for this path (you would if you later move to Docker with a different base image; see ARCHITECTURE.md).
4. Install command: leave as default — Vercel detects `pnpm-lock.yaml` and uses pnpm automatically.

### 4. Set environment variables

In the Vercel project's **Settings → Environment Variables**, add (Production environment at minimum; add the same to Preview if you want PR previews to work):

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string from step 1 |
| `JWT_SECRET` | a long random string, different from your local one |
| `GEMINI_API_KEY` | your Gemini key, if using AI features |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | if using push notifications (see [known gap](#part-8--post-deploy-checklist-and-known-gaps) below first) |

Don't add `NODE_ENV` — Vercel sets that itself.

### 5. Deploy

Click **Deploy**, or just push to the connected branch — Vercel builds and deploys automatically on every push once connected. First deploy will take a few minutes (installing ~70 dependencies, generating the Prisma client, building Next.js).

### 6. Verify

- Visit the deployed URL, log in with a seeded account (seed production the same way as [Part 1 step 5](#5-seed-sample-data), pointed at the production `DATABASE_URL` — or create your own admin account and skip the sample data).
- Take the sample quiz end-to-end and confirm the score appears.
- Check Vercel's **Functions** logs tab if anything 500s — Prisma connection errors here almost always mean `DATABASE_URL` is wrong or the Neon database is paused (free-tier Neon auto-suspends after inactivity and wakes on the first request, which can take a few seconds).

### 7. Custom domain (optional)

Vercel project → **Settings → Domains** → add your domain, follow the DNS instructions it gives you (a `CNAME` to `cname.vercel-dns.com`, or an `A` record if it's an apex domain). HTTPS is automatic.

---

## Part 5 — Alternative hosting options

### Render / Railway / Fly.io (managed Node hosting)

Same shape as Vercel: connect the GitHub repo, set the build command to `pnpm build` and the start command to `pnpm start`, add the same environment variables from [Part 6](#part-6--environment-variables-reference), provision a Postgres add-on (all three offer one), and run `prisma migrate deploy` against it once before the first deploy. The main difference from Vercel is these run a persistent Node process rather than serverless functions — fine either way for this app, since nothing here currently depends on serverless-specific behavior.

### Self-hosted VPS (Hetzner, DigitalOcean, a spare machine, etc.)

1. Install Node 20+, pnpm, and Postgres (or point at a managed Postgres instead of running it on the same box).
2. Clone the repo, `pnpm install`, set up `.env` per [Part 6](#part-6--environment-variables-reference).
3. `npx prisma migrate deploy`, then `pnpm build`.
4. Run it under a process manager so it survives reboots and crashes — either:
   ```bash
   npm install -g pm2
   pm2 start "pnpm start" --name quiz-app
   pm2 save && pm2 startup
   ```
   or a plain systemd unit running `pnpm start`.
5. Put Nginx or Caddy in front for TLS termination and a real domain:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```
   (Caddy is simpler if you want automatic HTTPS with zero config: `your-domain.com { reverse_proxy localhost:3000 }`.)

This is more ops work than Vercel for no functional benefit at this app's current scale — reach for it only if you specifically want full control or are avoiding Vercel for cost/policy reasons.

---

## Part 6 — Environment variables reference

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Prisma (all DB access) | Postgres connection string |
| `JWT_SECRET` | Recommended | `app/api/auth/login`, `app/api/auth/signup` | Falls back to a hardcoded default string if unset — **set this in any real deployment** |
| `GEMINI_API_KEY` | No | `app/api/ai/*`, `app/api/generate-flashcards` | AI features return errors (or a local fallback, for flashcards) without it |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Browser push subscription | Public, safe to expose client-side |
| `VAPID_PRIVATE_KEY` | No | `lib/push-notification-utils.ts` | Keep secret |
| `VAPID_EMAIL` | No | same | Contact address required by the Web Push protocol |
| `NODE_ENV` | Auto-set | Next.js, Prisma logging | Don't set manually on Vercel/Render/Railway — they set it themselves |

Variables that appear in this repo's `.env`/`.env.local` files but **aren't actually read anywhere in the code**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `LOCAL_DATABASE_URL`. Safe to omit in a new setup — they're leftovers from an earlier NextAuth-based design that was never finished (the app's auth is fully custom; see [Known gaps](#part-8--post-deploy-checklist-and-known-gaps)).

---

## Part 7 — Production database migrations

- **Always use `npx prisma migrate deploy` against production**, never `migrate dev` (that command can prompt to reset the database if it detects drift — fine for a local dev database, destructive against real data).
- Run it as a one-off step before or right after each deploy that includes a new migration — it's idempotent (already-applied migrations are skipped), so running it on every deploy is safe.
- Neon (and most managed Postgres providers) support branching — create a branch from production, run the migration there first, and sanity-check it before applying to the real database.
- Back up before any migration that alters or drops a column. On Neon, point-in-time restore covers this automatically on paid tiers; on a self-hosted Postgres, `pg_dump` first.

---

## Part 8 — Post-deploy checklist and known gaps

Things worth knowing before you put this in front of real users, in the order they matter:

1. **Several admin routes only check that a Bearer token is ≥10 characters long** — not that it's a valid, signed credential. If you're deploying this for anything beyond a demo/personal project, treat every `/api/admin/*` route as effectively unauthenticated until that's fixed (tracked in [ARCHITECTURE.md](ARCHITECTURE.md)'s Phase 2).
2. **Passwords are stored and compared in plaintext** (`app/api/auth/login/route.ts`). Same caveat as above.
3. **A handful of `/api/debug/*` routes are unauthenticated** and one of them returns a slice of your `DATABASE_URL`. Delete `app/api/debug/*` before a real deployment, or at minimum put them behind auth.
4. **Push notifications are silently non-functional as configured**: the server checks `process.env.VAPID_PUBLIC_KEY`, but only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is ever set. Sends return `{success: false}` without erroring loudly. Either fix the env var name mismatch or don't wire up push in production yet.
5. **The client-scored quiz flow described in older commits has been replaced** by a server-authoritative one (`/api/attempts/*`) — if you're deploying an older checkout of this repo rather than current `main`, scores can be forged by the client; make sure you're on a version that includes the `Attempt` model migration.
6. **`app/goals/page.tsx`'s goal history is stored in the browser's localStorage**, not the database — it won't follow a user across devices, and clearing browser data resets it. Known limitation, not a deploy blocker.

For the fuller list and the reasoning behind it, see [ARCHITECTURE.md](ARCHITECTURE.md)'s Phase 0 section.

---

## Part 9 — Troubleshooting

**`Can't reach database server` during `prisma generate` or at runtime**
- Check `DATABASE_URL` is set and the value is correct (no stray quotes, correct password).
- If using Neon free tier, the database may be suspended after inactivity — it wakes on the first connection attempt, which can take a few seconds; retry.
- If you're behind a restrictive network/VPN/corporate proxy or a sandboxed dev container, outbound port 5432 may be blocked even when HTTPS works fine — test with `curl -v https://<your-neon-host>` (should connect) vs. an actual Postgres client to isolate whether it's a credentials problem or a network policy blocking the database port specifically.

**`pnpm install --frozen-lockfile` fails / lockfile out of date**
- Someone edited `package.json` without regenerating `pnpm-lock.yaml`. Run `pnpm install` (without `--frozen-lockfile`) locally, commit the updated lockfile.

**Playwright can't find/launch a browser**
- Run `npx playwright install chromium` (or `--with-deps chromium` on a fresh Linux CI box, which also installs OS-level libraries Chromium needs).

**Build fails with a Next.js 15 "params should be awaited" type error**
- Any dynamic route handler or page still using the old `{ params }: { params: { id: string } }` signature needs the Next 15 async form: `props: { params: Promise<{ id: string }> }` + `const params = await props.params`. Next ships a codemod for this: `npx @next/codemod@canary next-async-request-api .`

**Seed script can't find `DATABASE_URL`**
- See the callout in [Part 1, step 3](#3-configure-environment-variables) — plain `tsx`/Prisma CLI invocations only auto-load `.env`, not `.env.local`. Pass it inline or add a `.env` file.
