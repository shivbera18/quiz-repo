# Oracle Cloud VPS Setup — Step by Step

This is the complete, start-to-finish guide for setting up the Oracle Cloud "Always Free" VM that runs this project's backend (gateway + 5 services + their workers, Postgres, Redis, Redpanda, MinIO). It assumes nothing exists yet — if you've already created the VM, jump to [Step 5](#step-5-first-ssh-connection).

This guide targets **Oracle Linux 9** (the OS Oracle's console defaults to, and the one with the most reliable ARM/`A1.Flex` image availability across regions — Ubuntu's aarch64 image build isn't listed in every tenancy/region). Default username is **`opc`**, package manager is **`dnf`**, and the OS-level firewall is **`firewalld`** — all different from a typical Ubuntu box. If you managed to get an Ubuntu aarch64 image working in your region instead, the only steps that differ are 3–6b and 8 (username, package manager, firewall, Docker install); everything from Step 9 onward is identical either way.

This is the one place this repo documents Oracle VPS setup in depth — [HOSTING.md](HOSTING.md) and [DEPLOYMENT.md](DEPLOYMENT.md) both link here instead of repeating it, so follow this document start to finish and then continue in **[DEPLOYMENT.md](DEPLOYMENT.md) starting at Part 2** for the GitHub Actions auto-deploy and Vercel setup.

## What you'll have at the end

- A perpetually-free ARM VM (4 OCPUs, 24GB RAM) reachable at a domain of your choice
- Docker + Docker Compose running all 11 backend processes plus Postgres/Redis/Redpanda/MinIO
- Caddy in front of the gateway, with automatic HTTPS
- Database migrated and seeded
- Daily backups and log rotation configured

## Prerequisites

- An email address and a payment card (Oracle requires this for identity verification even for the free tier — **Always Free resources are never actually billed against it**; the risk is only if you separately provision something outside the Always Free list, which this guide never does)
- A domain name you control (for `api.your-domain.com` — you can use a subdomain of anything you already own; you don't need a new domain just for this)
- An SSH client (already built into macOS/Linux terminals and modern Windows via `ssh` in PowerShell/Git Bash)

---

## Step 1 — Create the Oracle Cloud account

1. Go to https://www.oracle.com/cloud/free/ and click **Start for free**.
2. Fill in your details. You'll be asked for a payment card — this is identity verification only.
3. Pick your **Home Region** carefully during signup — this is **permanent** for your tenancy and determines where "Always Free" resources are available to you. Pick one close to your users (or close to you, for a demo/portfolio project).
4. Verify your email, complete signup, and log in to the **OCI Console** (Oracle Cloud Infrastructure's dashboard).

## Step 2 — Create the Compute VM

1. In the OCI Console, use the search bar at the top (or the ☰ hamburger menu) and go to **Compute → Instances**.
2. Click **Create Instance**.
3. **Name**: something like `quiz-platform-vm`.
4. **Placement**: leave the default availability domain unless you have a reason to change it.
5. **Image and shape** → click **Edit**:
   - **Image**: select **Oracle Linux**, pick the newest **9** build offered (this is also what the console defaults to if you don't touch this field).
   - **Shape**: click **Change shape**, select the **Ampere** family, choose **VM.Standard.A1.Flex**, then set:
     - **Number of OCPUs**: `4`
     - **Memory (GB)**: `24`
     
     This is the full Always Free Ampere allowance — using it all in one instance (rather than splitting across several smaller ones) is the right call for this project, since Docker Compose needs everything on one box anyway.
6. **Networking**: leave the auto-created VCN and subnet selected (Oracle creates one for you automatically if this is your first instance). Make sure **"Assign a public IPv4 address"** is checked.
7. **Add SSH keys**: select **Generate a key pair for me**, then click **Save private key** — this downloads a `.key` file (e.g. `ssh-key-2026-07-29.key`). **This is the only time you can download it; keep it somewhere safe.** (If you'd rather use a key you already have, select **Upload public key file** instead and upload your own `~/.ssh/id_ed25519.pub`.)
8. **Boot volume**: leave the default (~50GB) — still inside the Always Free allowance.
9. Click **Create**. The instance takes a minute or two to reach the **Running** state.

## Step 3 — Note your connection details

Once the instance shows **Running**, open it and note:
- **Public IP address** (shown on the instance's detail page) — you'll need this constantly, consider writing it down or setting a shell variable for it.
- The default username for Oracle Linux images on Oracle Cloud is **`opc`**.

## Step 4 — Fix the private key's permissions and connect

If you're on macOS/Linux (or Git Bash/WSL on Windows):

```bash
chmod 600 ~/Downloads/ssh-key-2026-07-29.key   # SSH refuses to use a key with overly-open permissions
ssh -i ~/Downloads/ssh-key-2026-07-29.key opc@<vm-public-ip>
```

On Windows PowerShell, `chmod` doesn't exist — instead, right-click the `.key` file → Properties → Security → Advanced → remove inheritance and restrict access to just your user account, or simply use WSL/Git Bash for the `ssh` commands in this guide (recommended — the rest of this guide assumes a Unix-like shell).

Type `yes` when asked to confirm the host's fingerprint on first connection. You should land at an `opc@<hostname>:~$` prompt.

## Step 5 — First SSH connection

(If you skipped here because the VM already exists: confirm you can `ssh opc@<vm-public-ip>` before continuing.)

Update the box once, as a sanity check that networking/DNS resolution work from inside the VM:

```bash
sudo dnf update -y
```

## Step 6 — Open the firewall (both layers)

Oracle Cloud has **two independent firewalls** — missing the second one is the single most common reason "it works from the VM but not from the internet."

### 6a. Cloud-level (Security List)

1. OCI Console → **Networking → Virtual Cloud Networks**.
2. Click your VCN (created automatically in Step 2).
3. Click **Security Lists** in the left panel, then the **Default Security List** for your VCN.
4. Click **Add Ingress Rules**, and add two rules:
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `80`
   - Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `443`
5. Save. Port 22 (SSH) should already be open from an existing default rule — confirm it's there; if not, add it the same way with port `22`.

**Deliberately do not** add rules for 5433, 6380, 19092, 8082, 8090, 9000, 9001, 9644, or 4000–4005 — those stay closed at this layer. `docker-compose.prod.yml` (used later) rebinds all of them to `127.0.0.1` as a second layer of protection, but this cloud firewall staying closed is the actual control.

### 6b. OS-level (firewalld)

Oracle Linux 9 ships with `firewalld` active by default, and it blocks 80/443 out of the box even after the Security List (6a) is open — this is the layer people most often forget on Oracle Linux specifically. Back on the SSH session:

```bash
sudo firewall-cmd --list-all
```

Check the `ports:` line. If 80/443 aren't listed, open them:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all   # confirm 80/tcp and 443/tcp now show under ports:
```

(If `firewall-cmd` isn't found at all — some minimal images ship without it — check `sudo iptables -L -n` for `ACCEPT` rules on 80/443 instead, and add them with `sudo iptables -I INPUT -p tcp --dport <port> -j ACCEPT` followed by `sudo dnf install -y iptables-services && sudo service iptables save` if you need it to persist a reboot.)

## Step 7 — Point DNS at the VM

In your domain registrar's DNS settings, add an **A record**:

| Type | Host | Value |
|---|---|---|
| A | `api` (i.e. `api.your-domain.com`) | your VM's public IP from Step 3 |

DNS propagation can take a few minutes to a few hours depending on your registrar. You can check progress with:

```bash
dig +short api.your-domain.com
```

Once it prints your VM's IP, move on — Caddy (Step 12) needs this working before it can request a TLS certificate.

## Step 8 — Install Docker

Docker's convenience script (`get.docker.com`) doesn't reliably detect Oracle Linux, so install the CentOS-compatible repo directly instead (Oracle Linux 9 is RHEL-compatible, and Docker's CentOS packages install cleanly on it):

```bash
sudo dnf install -y dnf-utils
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker              # applies the new group to this session without needing to log out/in
docker --version            # sanity check
docker compose version      # confirm the v2 plugin (used throughout this guide) is present
```

## Step 9 — Clone the repository

```bash
cd ~
git clone https://github.com/shivbera18/quiz-repo-microservice.git
cd quiz-repo-microservice
```

**If the repo is private**, the plain `git clone` above will fail with a permission error. Pick one:

- **SSH deploy key** (recommended, read-only, scoped to this repo): on the VM, `ssh-keygen -t ed25519 -C "oracle-vm-deploy" -N ""` (accept the default file path), then `cat ~/.ssh/id_ed25519.pub` and add that as a **Deploy Key** under the repo's GitHub Settings → Deploy keys (read-only is enough since this key only ever pulls). Then clone with `git clone git@github.com:shivbera18/quiz-repo-microservice.git` instead.
- **Personal Access Token embedded in the remote URL**: `git remote set-url origin https://<token>@github.com/shivbera18/quiz-repo-microservice.git` after cloning normally once with the token in the URL, or directly `git clone https://<token>@github.com/shivbera18/quiz-repo-microservice.git`.

Whichever you pick, it needs to keep working **unattended** — this is the same credential the GitHub Actions auto-deploy workflow relies on when it SSHs in and runs `git pull` later (see DEPLOYMENT.md Part 2), so avoid anything that would prompt interactively (no passphrase on the deploy key; a long-lived, not short-expiry, token).

## Step 10 — Configure secrets

```bash
cd infra
cp .env.example .env
nano .env
```

Fill in a real random value for every password field. Generate each one with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

(No Node installed on the VM? `openssl rand -base64 24` works just as well for this.) Leave `GEMINI_API_KEY`/`VAPID_*` blank if you're not using AI generation or push notifications yet — those features degrade gracefully without them.

Save and exit (`Ctrl+O`, Enter, `Ctrl+X` in nano).

> **Planning to use Neon instead of the bundled Postgres container?** Skip `infra/.env`'s `*_RW_PASSWORD`/`POSTGRES_ADMIN_PASSWORD` fields, drop `postgres` from the service list in Step 12's `up` command, and instead set each service's `DATABASE_URL` directly — as real environment overrides in `infra/docker-compose.yml`, or better, in a small `infra/docker-compose.override.yml` you keep local and don't commit — to `postgresql://<neon-role>:<neon-password>@<neon-host>/quiz?schema=<service-schema>&sslmode=require` (a different `<service-schema>` per service: `identity`, `catalog`, `assessment`, `analytics`, `notification`). You'd still need to run `infra/postgres/init/01-schemas-roles.sh`'s SQL once against the Neon database yourself (Neon's SQL editor, or `psql "<neon-connection-string>"`) since that script only auto-runs against the bundled container on its first boot, never against an external database. Send over the real Neon connection details when you have them and this can be wired up precisely rather than left as a template.

## Step 11 — Set the Caddy domain

```bash
cd ..   # back to repo root
nano infra/Caddyfile
```

Replace `DOMAIN_PLACEHOLDER` with `api.your-domain.com` (the exact domain from Step 7). Save and exit.

## Step 12 — First deploy

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  up -d --build \
  postgres redis redpanda redpanda-console minio minio-init \
  gateway identity-svc catalog-svc catalog-ai-worker \
  assessment-svc assessment-worker \
  analytics-svc analytics-rollup-consumer analytics-export-worker \
  notification-svc notification-worker \
  caddy
```

This builds all 11 backend Dockerfiles from source on a 4-core ARM box — **10–20 minutes is normal for this first run**; later deploys are much faster since most Docker layers cache. `web` is intentionally not in this list — it deploys to Vercel instead (DEPLOYMENT.md Part 3), not on this VM.

Watch progress with, in a second SSH session:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f
```

Once it settles, check everything is up and healthy:

```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml ps
```

Every service with a healthcheck should show `(healthy)`, not `(starting)` or `(unhealthy)` after a couple of minutes.

## Step 13 — Migrate and seed the database

```bash
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec identity-svc pnpm db:seed

docker compose -f infra/docker-compose.yml exec catalog-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec catalog-svc pnpm db:seed

docker compose -f infra/docker-compose.yml exec assessment-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec analytics-svc pnpm db:migrate
docker compose -f infra/docker-compose.yml exec notification-svc pnpm db:migrate
```

`db:seed` creates the two default accounts (`admin@quizapp.com` / `admin123` and `student@test.com` / `student123`) and a sample quiz — safe to re-run any time, it resets those specific rows rather than erroring.

## Step 14 — Verify

```bash
curl https://api.your-domain.com/healthz
```

Expect `{"status":"ok"}`. The first request to a fresh domain takes a couple of extra seconds while Caddy completes its one-time ACME/Let's Encrypt challenge and caches the certificate — if it times out, wait 10 seconds and try again before assuming something's broken.

If this doesn't work, see [Troubleshooting](#troubleshooting) below before moving on to GitHub Actions/Vercel setup — everything after this point in DEPLOYMENT.md assumes this URL actually works.

## Step 15 — Backups

There's no managed-Postgres PITR safety net on a self-hosted container the way Neon would give you — back up the volume yourself, and copy it off the VM.

```bash
mkdir -p ~/backups
sudo tee /etc/cron.daily/quiz-db-backup > /dev/null <<'SCRIPT'
#!/bin/bash
set -a; source /home/opc/quiz-repo-microservice/infra/.env; set +a
docker compose -f /home/opc/quiz-repo-microservice/infra/docker-compose.yml exec -T \
  -e PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-quiz_admin_pw}" postgres \
  pg_dump -U quiz_admin quiz | gzip > /home/opc/backups/quiz-$(date +%F).sql.gz
find /home/opc/backups -mtime +14 -delete
SCRIPT
sudo chmod +x /etc/cron.daily/quiz-db-backup
```

Test it runs cleanly once by hand: `sudo /etc/cron.daily/quiz-db-backup && ls -la ~/backups`.

For real off-VM safety, periodically copy `~/backups/*.sql.gz` somewhere else — Oracle Object Storage has its own Always Free allowance (10GB), plenty for compressed SQL dumps, or just `scp` them to your own machine occasionally.

## Step 16 — Log rotation

Docker's default logging driver doesn't rotate on its own and will eventually fill the disk on a long-lived box:

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
sudo systemctl restart docker
```

This only affects newly-created containers, so re-apply it once: `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --force-recreate` (safe, brief restart of everything).

## What's next

The VPS side is done. Continue in **[DEPLOYMENT.md](DEPLOYMENT.md), starting at Part 2** for:
- The GitHub Actions workflow that auto-redeploys this VM on every push to `main`
- The Vercel setup for `apps/web`
- End-to-end verification once both sides are wired together

## Ongoing operations cheat-sheet

```bash
# live logs, all services
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f

# live logs, one service
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs -f gateway

# restart everything (e.g. after editing infra/.env by hand)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --force-recreate

# reach a normally-localhost-only port from your own machine (e.g. Redpanda Console)
ssh -L 8090:localhost:8090 opc@<vm-public-ip>
# then open http://localhost:8090 on YOUR machine
```

`restart: unless-stopped` (already set on every service) means a VM reboot brings the whole stack back up on its own, as long as Step 8's `systemctl enable --now docker` ran successfully.

## Troubleshooting

**`ssh: connect to host <ip> port 22: Connection timed out`**
- Port 22 isn't actually open in the Security List (Step 6a), or you're using the wrong IP (double-check the instance detail page — the public IP can look similar to the private one).

**`Permission denied (publickey)`**
- Wrong key file, wrong username (must be `opc` for Oracle Linux images), or the key's file permissions are too open (`chmod 600` the key file again).

**`curl https://api.your-domain.com/healthz` times out or connection-refuses**
- `dig +short api.your-domain.com` doesn't show your VM's IP yet — DNS hasn't propagated, wait longer.
- Security List doesn't actually have the 80/443 rules saved (go back and re-check — it's easy to click "Add" without the rule actually persisting if a required field was empty).
- `firewalld` (Step 6b) is still blocking the ports at the OS level even though the Security List is open — re-run `sudo firewall-cmd --list-all` and confirm 80/443 show under `ports:`.
- `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs caddy` — a `DOMAIN_PLACEHOLDER` never replaced in `infra/Caddyfile` is the most common cause; Caddy can't request a certificate for a literal placeholder string.

**A container fails to start with a permission/mount error, or Postgres can't write to its data directory**
- SELinux is enforcing by default on Oracle Linux 9 (it isn't on Ubuntu, so this only shows up here). Confirm with `getenforce`. Check for denials with `sudo ausearch -m avc -ts recent` — if you see AVC denials referencing Docker's volume paths, the quick unblock is `sudo setenforce 0` (temporary, until reboot) to confirm SELinux is actually the cause, then either add proper SELinux volume labels (mount options `:z`/`:Z` in `infra/docker-compose.yml`) for a real fix, or persist permissive mode via `/etc/selinux/config` if you'd rather not deal with labeling on a single-purpose box.

**A container shows `(unhealthy)` in `docker compose ps`**
- `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml logs <service-name>` — almost always either a missing migration (service can't reach its schema yet, run Step 13) or a wrong `DATABASE_URL`/role password (compare `infra/.env` against what `infra/postgres/init/01-schemas-roles.sh` expects).

**`docker compose exec <service> pnpm db:migrate` fails with "role does not exist"**
- `infra/postgres/init/*.sh` only runs the very first time the `postgres` container initializes its data volume. If you brought Postgres up once before finishing Step 10 (secrets), the roles were created with the *default* dev passwords, not your real ones. Wipe and restart clean: `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml down -v` (this deletes the Postgres/Redpanda/MinIO volumes — fine if you haven't seeded real data yet) then repeat Step 12 onward.

**Ran out of disk space**
- Old Docker image layers from repeated rebuilds: `docker image prune -f` (or `docker system prune -f` for a more aggressive clean, which also removes stopped containers and unused networks).
- Forgot Step 16 (log rotation) and logs grew unbounded: `du -sh /var/lib/docker/containers/*/*-json.log` to confirm, then do Step 16 now.
