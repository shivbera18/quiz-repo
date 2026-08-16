---
name: infrastructure-and-deployment
description: Modify or troubleshoot Docker, Compose, environment configuration, GitHub Actions, Caddy, service health checks, local stack startup, and production deployment for the quiz platform.
---

# Infrastructure and Deployment

Keep local and production environments reproducible, secret-safe, and aligned with application behavior.

## Relevant files

- `infra/docker-compose.yml`: local/base stack.
- `infra/docker-compose.prod.yml`: production overrides.
- `infra/Caddyfile`: public TLS/reverse proxy configuration.
- `infra/postgres/init/`: initial schema and role setup.
- `.github/workflows/`: CI, deployment, and backup automation.
- Root `.env.example`, `infra/.env.example`, Dockerfiles, and deployment docs.

## Workflow

1. Read the base Compose file and all applied overrides before changing a service.
2. Trace every changed variable through example env files, Compose, Dockerfile, application startup validation, and CI/deployment secrets.
3. Keep internal and host addresses distinct. In Compose, services use names such as `postgres`, `redis`, and `redpanda`; host-run processes use published ports.
4. Preserve health checks, `depends_on` conditions, restart behavior, logging limits, persistent volumes, and worker processes.
5. Validate configuration before starting or deploying.
6. Update example configuration and relevant documentation for operator-visible changes.
7. Prefer narrow service rebuilds/log inspection while debugging.

## Safety rules

- Never print, commit, or copy values from `.env`, `infra/.env`, production secrets, private keys, or database dumps.
- Do not add real credentials to Compose defaults or example files.
- Do not delete volumes, databases, buckets, or deployment resources without explicit approval and a recovery plan.
- Preserve production defense in depth: only Caddy should be publicly exposed by production overrides.
- Pin images or document upgrade risk; avoid unrelated `latest` upgrades.
- Backups are not valid until restoration has been tested.

## Useful commands

```bash
docker compose -f infra/docker-compose.yml config
pnpm compose:up
pnpm compose:logs
pnpm compose:down

docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml config
```

Use `docker compose ps` and targeted logs for health failures. Avoid `down -v` unless destructive volume removal is explicitly requested.

## Completion report

Describe services/config affected, validation run, rollout and rollback concerns, health status, and any secrets or production actions the user must perform manually.
