#!/usr/bin/env node
/**
 * Run prisma migrate deploy for all 5 services with per-service ?schema= suffix.
 * Usage:
 *   DATABASE_URL="postgresql://.../db?sslmode=require" node scripts/migrate-local.mjs
 *   pnpm db:migrate:local
 */
import { spawnSync } from "node:child_process"
import path from "node:path"

try {
  if (typeof process.loadEnvFile === "function") {
    for (const p of [".env", ".env.local"]) {
      try { process.loadEnvFile(path.resolve(process.cwd(), p)) } catch {}
    }
  }
} catch {}

const baseUrl = process.env.DATABASE_URL
if (!baseUrl) {
  console.error("DATABASE_URL not set")
  process.exit(1)
}

function withSchema(url, schema) {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has("schema")) {
      parsed.searchParams.set("schema", schema)
    }
    return parsed.toString()
  } catch {
    if (url.includes("schema=")) return url
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}schema=${schema}`
  }
}

const services = [
  { filter: "identity-svc", schema: "identity" },
  { filter: "catalog-svc", schema: "catalog" },
  { filter: "assessment-svc", schema: "assessment" },
  { filter: "analytics-svc", schema: "analytics" },
  { filter: "notification-svc", schema: "notification" },
]

for (const { filter, schema } of services) {
  const url = withSchema(baseUrl, schema)
  // Also support per-service override: if e.g. CATALOG_DATABASE_URL is set, use it
  const perServiceKey = `${schema.toUpperCase()}_DATABASE_URL`
  const finalUrl = process.env[perServiceKey] || url
  console.log(`\n→ migrating ${filter} (schema=${schema}) ...`)
  const res = spawnSync("pnpm", ["--filter", filter, "db:migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: finalUrl },
    shell: true,
  })
  if (res.status !== 0) {
    console.error(`✗ ${filter} migrate failed`)
    process.exit(res.status ?? 1)
  }
  console.log(`✓ ${filter} migrated`)
}
console.log("\nAll services migrated")
