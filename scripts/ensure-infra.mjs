#!/usr/bin/env node
// Ensures essential infra (postgres, redis, redpanda, minio) is up.
// Idempotent — keeps existing volumes/data, just starts what is stopped.
// Used by `pnpm dev` so a single terminal does everything.
import { spawnSync } from "node:child_process"

const essential = ["postgres", "redis", "redpanda", "redpanda-console", "minio", "minio-init"]

console.log("[ensure-infra] Checking essential Docker infra (postgres, redis, redpanda, minio)...")
const res = spawnSync("docker", ["compose", "-f", "infra/docker-compose.yml", "up", "-d", ...essential], {
  stdio: "inherit",
  shell: true,
})

// wait a moment for health, but don't block long
if (res.status === 0) {
  console.log("[ensure-infra] Infra up (data volumes preserved).")
} else {
  console.warn("[ensure-infra] Docker compose up failed — is Docker Desktop running?")
  process.exit(res.status ?? 1)
}
