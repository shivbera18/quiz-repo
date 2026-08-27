#!/usr/bin/env node
/**
 * Create Postgres schemas for Docker-free local dev on a single Neon/Supabase DB.
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" node scripts/setup-local-db.mjs
 *   # or with pnpm:
 *   pnpm db:migrate:local   # which runs this script then prisma migrate
 *
 * Requires `pg` (already a dependency of analytics-svc). Falls back to `postgres` npm if not found.
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

let Client
try {
  const pg = await import("pg")
  Client = pg.Client
} catch {
  console.error("Missing 'pg' - install with: pnpm add -w pg")
  process.exit(1)
}

// Load .env if present (Node 20.12+ has process.loadEnvFile, else try dotenv)
try {
  if (typeof process.loadEnvFile === "function") {
    for (const p of [".env", ".env.local"]) {
      try { process.loadEnvFile(path.resolve(process.cwd(), p)) } catch {}
    }
  } else {
    // try dotenv
    try {
      const dotenv = await import("dotenv")
      dotenv.config()
      dotenv.config({ path: ".env.local" })
    } catch {}
  }
} catch {}

const rawUrl = process.env.DATABASE_URL
if (!rawUrl) {
  console.error("DATABASE_URL not set. Set it in .env or .env.local (see .env.local.example)")
  process.exit(1)
}

// Strip ?schema= param for admin connection - we need to create schemas themselves
const url = rawUrl.split("?")[0] + (rawUrl.includes("sslmode") ? "?" + rawUrl.split("?")[1]?.replace(/&?schema=[^&]*/g, "").replace(/^&/, "") : "")
const cleanUrl = url.replace(/&&/g, "&").replace(/\?&/, "?").replace(/\?$/, "")

const schemas = ["identity", "catalog", "assessment", "analytics", "notification"]

console.log(`Connecting to ${cleanUrl.replace(/:[^:@/]+@/, ":****@")} ...`)
const client = new Client({ connectionString: cleanUrl, ssl: cleanUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined })

try {
  await client.connect()
  for (const s of schemas) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${s}"`)
    console.log(`✓ schema "${s}" ready`)
  }

  // Optional: create _prisma_migrations table per schema via prisma migrate later
  console.log("\nSchemas ready. Now run migrations:")
  console.log("  pnpm db:generate")
  console.log("  pnpm --filter identity-svc db:migrate")
  console.log("  pnpm --filter catalog-svc db:migrate")
  console.log("  pnpm --filter assessment-svc db:migrate")
  console.log("  pnpm --filter analytics-svc db:migrate")
  console.log("  pnpm --filter notification-svc db:migrate")
  console.log("Or: pnpm db:migrate:local")
} catch (err) {
  console.error("Failed to create schemas:", err.message)
  console.error(err)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
