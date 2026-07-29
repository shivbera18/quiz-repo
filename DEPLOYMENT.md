# Deployment Guide — Oracle VPS (backend) + Vercel (frontend)

This is the concrete, step-by-step guide for the deployment topology you're actually running: the 11 backend processes (gateway + 5 services + their workers/consumers) plus Postgres/Redis/Redpanda/MinIO on your Oracle free VPS, and `apps/web` on Vercel. Every push to `main` redeploys both sides automatically.

For the broader "why" behind any of this (architecture rationale, other hosting options, known gaps) see [ARCHITECTURE.md](ARCHITECTURE.md) and [HOSTING.md](HOSTING.md) — this document is deliberately just the operational checklist.

## Contents

- [Topology](#topology)
- [Part 1 — One-time Oracle VPS setup](#part-1--one-time-oracle-vps-setup)
- [Part 2 — GitHub Actions auto-deploy setup](#part-2--github-actions-auto-deploy-setup)
- [Part 3 — Vercel frontend setup](#part-3--vercel-frontend-setup)
- [Part 4 — What happens on every push](#part-4--what-happens-on-every-push)
- [Part 5 — End-to-end verification](#part-5--end-to-end-verification)
- [Part 6 — Troubleshooting](#part-6--troubleshooting)

---

## Topology

```
GitHub (quiz-repo-microservice, main)
  │
  ├─ push ──▶ CI workflow (typecheck/lint/test/build)
  │              │
  │              └─ on success ──▶ deploy-oracle.yml (SSH into the VPS,
  │                                 git pull, docker compose up --build,
  │                                 run migrations)
  │
  └─ push ──▶ Vercel's own GitHub integration (independent of the above;
               Vercel watches the repo itself, no workflow file needed)
                 │
                 └─ builds apps/web (Root Directory), deploys automatically

                                          ┌─────────────────────────────┐
 Vercel (apps/web) ── HTTPS, server-side ▶│  Oracle VPS                  │
   GATEWAY_URL=https://api.yourdomain.com │  Caddy :443 → gateway :4000  │
                                          │  → identity/catalog/         │
                                          │    assessment/analytics/     │
                                          │    notification-svc          │
                                          │  → Postgres/Redis/Redpanda/  │
                                          │    MinIO (internal only)     │
                                          └─────────────────────────────┘
```

Two independent deploy mechanisms, both triggered by the same `git push`:
1. **Backend**: GitHub Actions SSHs into the Oracle VM and redeploys the Docker Compose stack.
2. **Frontend**: Vercel's own git integration builds and deploys `apps/web` — nothing in this repo's `.github/workflows/` controls that side; it's configured once in Vercel's dashboard (Part 3) and then just works on every push.

The browser only ever talks to Vercel. Vercel's server-side route handlers (every file under `apps/web/app/api/**`) are the only thing that calls the Oracle-hosted gateway, over the public internet — that's why the gateway (not `web`) is the thing Caddy fronts on the VPS now; see `infra/Caddyfile`'s own comment.

---

## Part 1 — One-time Oracle VPS setup

This part now lives in its own document: **[ORACLE_SETUP.md](ORACLE_SETUP.md)** — account creation, VM shape, the ARM64 image-compatibility check worth doing up front, both firewall layers, DNS, Docker install, cloning the repo (including the private-repo auth options), secrets, the first deploy, migrations, verification, backups, and log rotation, plus its own troubleshooting section.

**Follow it start to finish now, then come back here and continue at Part 2.** By the end of it you should have `curl https://api.your-domain.com/healthz` returning `{"status":"ok"}` — everything below assumes that's true.

---

## Part 2 — GitHub Actions auto-deploy setup

This wires up `.github/workflows/deploy-oracle.yml`, which SSHs into the VM and reruns [ORACLE_SETUP.md](ORACLE_SETUP.md)'s deploy and migrate steps automatically whenever CI passes on `main`.

### 1. Generate a dedicated deploy key

Don't reuse your personal SSH key. On your own machine (or the VM):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./gh-actions-deploy-key -N ""
```

This produces `gh-actions-deploy-key` (private) and `gh-actions-deploy-key.pub` (public).

### 2. Authorize the public key on the VM

```bash
ssh ubuntu@<vm-public-ip> "echo '<contents of gh-actions-deploy-key.pub>' >> ~/.ssh/authorized_keys"
```

### 3. Add repository secrets

GitHub → `quiz-repo-microservice` → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `ORACLE_HOST` | the VM's public IP (or a domain if you've pointed one at it for SSH) |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | the full contents of `gh-actions-deploy-key` (the **private** key, not `.pub`) |
| `ORACLE_PORT` | only if you're not using port 22 |

Delete the local `gh-actions-deploy-key` file once it's pasted into the GitHub secret — it doesn't need to live on your machine after that.

### 4. Confirm the trigger behavior

`deploy-oracle.yml` runs after the `CI` workflow completes on `main`, and only proceeds if CI succeeded — a broken commit won't redeploy the backend. Push something and watch both workflows in the **Actions** tab: `CI` runs first, then `Deploy backend to Oracle VPS` starts once it goes green.

If you'd rather deploy the instant you push, without waiting for CI (e.g. while you're still actively iterating and don't want the extra latency), change `deploy-oracle.yml`'s trigger from `workflow_run` to a plain `on: push: branches: [main]` — the trade-off is a broken commit gets deployed too, so this is deliberately not the default.

You can also trigger a redeploy with no new commit at all: Actions tab → "Deploy backend to Oracle VPS" → "Run workflow" (this uses the `workflow_dispatch` trigger already in the file).

---

## Part 3 — Vercel frontend setup

### 1. Import the project

https://vercel.com/new → import `shivbera18/quiz-repo-microservice` from GitHub.

### 2. Configure the monorepo root

In the import screen (or Project Settings → General afterward):
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js (auto-detected once Root Directory is set)
- **Build Command** / **Install Command**: leave as default — Vercel detects the `pnpm-workspace.yaml` at the true repo root and installs there automatically before building within `apps/web`, which is the standard supported pattern for pnpm monorepos on Vercel. Only override these if the default build fails (see [Troubleshooting](#part-6--troubleshooting)).

### 3. Environment variable

Settings → Environment Variables:

| Variable | Value | Environments |
|---|---|---|
| `GATEWAY_URL` | `https://api.your-domain.com` | Production, Preview |

This is read server-side, at request time, by every `apps/web/app/api/**` route handler — it's the one thing that has to be correct for anything to work.

### 4. Deploy

Click **Deploy**. From here on, every push to `main` triggers a new Vercel deployment automatically — this is Vercel's own GitHub integration, not something in this repo's workflow files, and it needs no further setup.

### 5. Custom domain (optional)

Project → Settings → Domains → add your main domain, follow the DNS instructions Vercel gives you.

---

## Part 4 — What happens on every push

1. You push to `main`.
2. GitHub Actions runs `CI` (typecheck, lint, unit tests, a real `next build` for `apps/web`) across all 11 workspace packages.
3. If `CI` succeeds, `deploy-oracle.yml` fires: SSHs into the Oracle VM, `git pull`s, rebuilds and restarts every backend container with `docker compose up -d --build`, then runs `prisma migrate deploy` for each of the 5 services (safe to run unconditionally — already-applied migrations are no-ops).
4. Independently and in parallel, Vercel's own integration builds and deploys `apps/web` from the same push.
5. Within a few minutes, both sides are live on the new commit — no manual steps for a normal change.

The only case needing a manual step is a change to `infra/.env` itself (new secret, rotated password) — GitHub Actions doesn't know about that file (it's gitignored, correctly), so you'd `nano infra/.env` on the VM directly and then either wait for the next push or trigger `deploy-oracle.yml` manually (Part 2, step 4) to pick it up.

---

## Part 5 — End-to-end verification

- `curl https://api.your-domain.com/healthz` → `{"status":"ok"}`
- Visit the Vercel URL, log in with a seeded account (`admin@quizapp.com` / `admin123` or `student@test.com` / `student123`, from [ORACLE_SETUP.md](ORACLE_SETUP.md)'s Step 13).
- Take the sample quiz end-to-end: start → answer → submit → see the score.
- Admin: create/edit a quiz, check the question bank, check announcements.
- Push a trivial commit (e.g. a comment change) and confirm both `CI` and `Deploy backend to Oracle VPS` go green in the Actions tab, and that Vercel shows a new deployment.

---

## Part 6 — Troubleshooting

**`curl https://api.your-domain.com/healthz` times out or connection-refuses**
- DNS not propagated yet (`dig api.your-domain.com` should show the VM's IP) — wait a few minutes.
- Cloud-level firewall not actually open (re-check the Security List ingress rules).
- Caddy container not healthy: `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs caddy` — a `DOMAIN_PLACEHOLDER` never replaced in `infra/Caddyfile` is the most common cause (Caddy can't request a cert for a literal placeholder string).

**`deploy-oracle.yml` fails at the SSH step**
- Double-check `ORACLE_SSH_KEY` secret is the **private** key's full contents (including the `-----BEGIN OPENSSH PRIVATE KEY-----`/`-----END...` lines), not the `.pub` file.
- Confirm the public key half is actually in `~/.ssh/authorized_keys` on the VM for the exact user in `ORACLE_USER`.

**`deploy-oracle.yml` fails at `git pull`**
- The repo is private and the VM's clone has no working credentials — see [ORACLE_SETUP.md's Step 9](ORACLE_SETUP.md#step-9--clone-the-repository) private-repo note.

**Vercel build fails with a pnpm/workspace-related error**
- Confirm Root Directory is exactly `apps/web` (Project Settings → General) and that `pnpm-lock.yaml` at the true repo root is committed and up to date (`pnpm install` locally, without `--frozen-lockfile`, if Vercel complains about a stale lockfile).

**Vercel deploys fine but every page 500s / API calls fail**
- `GATEWAY_URL` is wrong, unset, or the gateway isn't actually reachable at that URL yet — verify with the `curl` from Part 5 first, independent of Vercel entirely, before assuming the frontend is the problem.

**A migration seems to not have applied after a deploy**
- `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs <service>` — `prisma migrate deploy` logs exactly what it applied or skipped; check the specific service that owns the changed schema.
