import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Lightweight env loader for Docker-free local dev.
 * Tries to load .env and .env.local from the repo root, plus the current working directory.
 * Safe to call multiple times or when files don't exist. Uses `dotenv` if available,
 * falls back to Node's built-in `process.loadEnvFile` (Node 20.12+).
 */
let loaded = false
export function loadEnv(): void {
  if (loaded) return
  loaded = true
  try {
    if (typeof (process as any).loadEnvFile === "function") {
      const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.local"),
        // repo root from this file: packages/observability/src -> ../../..
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env.local"),
      ]
      for (const p of candidates) {
        try {
          ;(process as any).loadEnvFile(p)
        } catch {
          // ignore missing file
        }
      }
    }
  } catch {}
}

/**
 * Ensure DATABASE_URL is set for the given service.
 * If a per-service env like IDENTITY_DATABASE_URL exists, it takes precedence.
 * Otherwise, if DATABASE_URL lacks a `schema=` query param, append `?schema=<service>`
 * so a single Neon URL can back all 5 schemas (each Prisma client expects its own schema).
 * This is a no-op in Docker where DATABASE_URL already contains the correct schema.
 *
 * Must be called BEFORE `new PrismaClient()` because Prisma reads env at construction.
 */
export function ensureDatabaseUrl(service: "identity" | "catalog" | "assessment" | "analytics" | "notification"): string | undefined {
  loadEnv()
  const perServiceKey = `${service.toUpperCase()}_DATABASE_URL` as const
  const perServiceUrl = (process.env as Record<string, string | undefined>)[perServiceKey]
  let url = perServiceUrl || process.env.DATABASE_URL

  if (!url) return undefined

  // If URL already has schema=, respect it (Docker, explicit config)
  if (url.includes("schema=")) {
    if (perServiceUrl) process.env.DATABASE_URL = perServiceUrl
    return url
  }

  // Append schema for Neon single-URL local dev
  const schemaMap: Record<string, string> = {
    identity: "identity",
    catalog: "catalog",
    assessment: "assessment",
    analytics: "analytics",
    notification: "notification",
  }
  const schema = schemaMap[service] ?? service
  const sep = url.includes("?") ? "&" : "?"
  url = `${url}${sep}schema=${schema}`

  // Mutate process.env so Prisma's env("DATABASE_URL") sees the schema-qualified URL
  process.env.DATABASE_URL = url
  return url
}

export function isLocalDevWithoutDocker(): boolean {
  return process.env.DISABLE_KAFKA === "true" || process.env.DISABLE_REDIS === "true"
}
