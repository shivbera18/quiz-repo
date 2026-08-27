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
  const rawUrl = perServiceUrl || process.env.DATABASE_URL

  if (!rawUrl) return undefined

  try {
    const parsed = new URL(rawUrl)
    if (parsed.searchParams.has("schema")) {
      const urlWithSchema = parsed.toString()
      if (perServiceUrl) process.env.DATABASE_URL = urlWithSchema
      return urlWithSchema
    }
    parsed.searchParams.set("schema", service)
    const finalUrl = parsed.toString()
    process.env.DATABASE_URL = finalUrl
    return finalUrl
  } catch {
    // Fallback string handling for non-standard connection strings
    if (rawUrl.includes("schema=")) {
      if (perServiceUrl) process.env.DATABASE_URL = rawUrl
      return rawUrl
    }
    const sep = rawUrl.includes("?") ? "&" : "?"
    const fallbackUrl = `${rawUrl}${sep}schema=${service}`
    process.env.DATABASE_URL = fallbackUrl
    return fallbackUrl
  }
}

export function isLocalDevWithoutDocker(): boolean {
  return process.env.DISABLE_KAFKA === "true" || process.env.DISABLE_REDIS === "true"
}
