import Fastify from "fastify"
import cors from "@fastify/cors"
import httpProxy from "@fastify/http-proxy"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { getRedisClient } from "@quiz/redis-kit"
import { introspectToken, type IntrospectedUser } from "./auth.js"
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "./rate-limit.js"

const logger = createLogger("gateway")
const redis = getRedisClient()
const PORT = Number(process.env.PORT) || 4000

const SERVICES = {
  identity: process.env.IDENTITY_SVC_URL || "http://localhost:4001",
  catalog: process.env.CATALOG_SVC_URL || "http://localhost:4002",
  assessment: process.env.ASSESSMENT_SVC_URL || "http://localhost:4003",
  analytics: process.env.ANALYTICS_SVC_URL || "http://localhost:4004",
  notification: process.env.NOTIFICATION_SVC_URL || "http://localhost:4005",
}

// Exact-prefix routing table. Order matters only in that more specific
// prefixes (e.g. /v1/admin/attempts) must be registered -- Fastify's router
// matches the most specific static prefix regardless of registration order,
// but keeping this list grouped by service documents the seams clearly.
const ROUTES: Array<{ prefix: string; upstream: string }> = [
  { prefix: "/v1/auth", upstream: SERVICES.identity },
  { prefix: "/v1/users", upstream: SERVICES.identity },

  { prefix: "/v1/subjects", upstream: SERVICES.catalog },
  { prefix: "/v1/chapters", upstream: SERVICES.catalog },
  { prefix: "/v1/quizzes", upstream: SERVICES.catalog },
  { prefix: "/v1/ai", upstream: SERVICES.catalog },
  { prefix: "/v1/admin/subjects-chapters-quizzes", upstream: SERVICES.catalog },
  { prefix: "/v1/admin/subjects", upstream: SERVICES.catalog },
  { prefix: "/v1/admin/chapters", upstream: SERVICES.catalog },
  { prefix: "/v1/admin/quizzes", upstream: SERVICES.catalog },
  { prefix: "/v1/admin/question-bank", upstream: SERVICES.catalog },

  { prefix: "/v1/attempts", upstream: SERVICES.assessment },
  { prefix: "/v1/admin/attempts", upstream: SERVICES.assessment },
  // Legacy (pre-Attempt) QuizResult reporting -- see assessment-svc's
  // legacy.ts for why these exist alongside the new Attempt-based flow.
  { prefix: "/v1/legacy-results", upstream: SERVICES.assessment },
  { prefix: "/v1/legacy-analytics", upstream: SERVICES.assessment },
  { prefix: "/v1/admin/legacy-analytics", upstream: SERVICES.assessment },
  { prefix: "/v1/admin/legacy-results", upstream: SERVICES.assessment },
  { prefix: "/v1/admin/legacy-users", upstream: SERVICES.assessment },
  { prefix: "/v1/admin/legacy-user-performance", upstream: SERVICES.assessment },

  { prefix: "/v1/analytics", upstream: SERVICES.analytics },
  { prefix: "/v1/leaderboards", upstream: SERVICES.analytics },
  { prefix: "/v1/admin/exports", upstream: SERVICES.analytics },

  { prefix: "/v1/announcements", upstream: SERVICES.notification },
  { prefix: "/v1/admin/announcements", upstream: SERVICES.notification },
  { prefix: "/v1/push-subscriptions", upstream: SERVICES.notification },
  { prefix: "/v1/stream", upstream: SERVICES.notification },
]

// Paths reachable with no Authorization header at all. GET /v1/stream is
// here because EventSource can't set custom headers -- notification-svc
// authenticates that route itself via a single-use ticket (see its own
// POST /v1/stream/tickets, which DOES require normal auth to obtain one).
// Catalog's browsing GETs (subjects/chapters/quizzes-list) are public here
// because they always were in the monolith -- none of it is sensitive (no
// answer keys; those only ever live behind assessment-svc's snapshot and
// catalog-svc's never-proxied /internal/quizzes/:id/full).
function isPublicRoute(method: string, path: string): boolean {
  if (path === "/healthz" || path === "/readyz") return true
  if (method === "POST" && (path === "/v1/auth/login" || path === "/v1/auth/signup")) return true
  if (method === "GET" && path === "/v1/stream") return true
  if (method === "GET" && (path === "/v1/subjects" || path.startsWith("/v1/subjects/"))) return true
  if (method === "GET" && (path === "/v1/chapters" || path.startsWith("/v1/chapters/"))) return true
  if (method === "GET" && path === "/v1/quizzes") return true
  if (method === "GET" && /^\/v1\/quizzes\/[^/]+$/.test(path)) return true
  return false
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: IntrospectedUser
  }
}

async function main() {
  const app = Fastify({ loggerInstance: logger as any })
  await app.register(cors, { origin: true })

  app.addHook("onRequest", async (request, reply) => {
    const traceId = getOrCreateTraceId(request.headers[TRACE_HEADER] as string | undefined)
    ;(request as any).traceId = traceId
    reply.header(TRACE_HEADER, traceId)
  })

  app.get("/healthz", async () => ({ status: "ok" }))
  app.get("/readyz", async () => ({ status: "ready" }))

  // Single global gate: auth (via identity-svc introspection, Redis-cached)
  // then rate limiting. Runs in preHandler (not onRequest) because the
  // login/signup rate-limit-by-email policy needs the parsed JSON body,
  // which isn't available until after Fastify's body parser runs.
  app.addHook("preHandler", async (request, reply) => {
    // @fastify/http-proxy registers one wildcard route per prefix, so
    // request.routerPath/request.params never contain the real path
    // segments (e.g. an attempt id) -- match directly against the raw URL.
    const path = request.url.split("?")[0]
    const method = request.method

    if (path === "/healthz" || path === "/readyz") return

    if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.defaultByIp, request.ip))) return

    if (method === "POST" && path === "/v1/auth/login") {
      const email = (request.body as any)?.email
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.loginByIp, request.ip))) return
      if (email && !(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.loginByEmail, email))) return
    }
    if (method === "POST" && path === "/v1/auth/signup") {
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.signupByIp, request.ip))) return
    }

    if (isPublicRoute(method, path)) return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ message: "Unauthorized" })
      return
    }
    const token = authHeader.slice("Bearer ".length)

    let user: IntrospectedUser | null
    try {
      user = await introspectToken(redis, token)
    } catch (err) {
      logger.error(err, "token introspection failed")
      reply.code(503).send({ message: "Auth service unavailable" })
      return
    }
    if (!user) {
      reply.code(401).send({ message: "Unauthorized" })
      return
    }
    request.authUser = user

    if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.defaultByUser, user.userId))) return

    if (method === "POST" && path === "/v1/ai/quiz-generations") {
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.aiGenByUser, user.userId))) return
    }
    if (method === "POST" && path === "/v1/admin/exports") {
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.exportByUser, user.userId))) return
    }
    const answersMatch = method === "PATCH" && path.match(/^\/v1\/attempts\/([^/]+)\/answers$/)
    if (answersMatch) {
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.answersByAttempt, answersMatch[1]))) return
    }
    const submitMatch = method === "POST" && path.match(/^\/v1\/attempts\/([^/]+)\/submit$/)
    if (submitMatch) {
      if (!(await enforceRateLimit(redis, reply, RATE_LIMIT_POLICIES.submitByAttempt, submitMatch[1]))) return
    }
  })

  // Auth is terminated once here; every downstream service trusts these
  // headers instead of re-parsing a token. Any x-user-* header the caller
  // sent is dropped first -- otherwise a direct request (bypassing the
  // Authorization check) could just set x-user-is-admin: true itself.
  for (const { prefix, upstream } of ROUTES) {
    await app.register(httpProxy, {
      upstream,
      prefix,
      rewritePrefix: prefix,
      httpMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
          const clean = { ...headers }
          delete clean["x-user-id"]
          delete clean["x-user-name"]
          delete clean["x-user-email"]
          delete clean["x-user-is-admin"]
          delete clean["expect"]
          const user = (request as any).authUser as IntrospectedUser | undefined
          if (user) {
            clean["x-user-id"] = user.userId
            clean["x-user-name"] = user.name
            clean["x-user-email"] = user.email
            clean["x-user-is-admin"] = String(user.isAdmin)
          }
          return clean
        },
      },
    })
  }

  const close = async () => {
    await app.close()
    process.exit(0)
  }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)

  await app.listen({ port: PORT, host: "0.0.0.0" })
  logger.info(`gateway listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "gateway failed to start")
  process.exit(1)
})
