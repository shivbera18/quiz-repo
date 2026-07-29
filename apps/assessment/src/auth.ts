import type { FastifyRequest, FastifyReply } from "fastify"

// Same gateway header-trust pattern as catalog-svc's auth.ts. assessment-svc
// additionally needs name/email (not just id) because Attempt.userName/userEmail
// are frozen at attempt-start time -- see the AttemptSnapshot doc in schema.prisma.
export interface AuthUser {
  userId: string
  name: string
  email: string
  isAdmin: boolean
}

export function getUser(request: FastifyRequest): AuthUser | undefined {
  const userId = request.headers["x-user-id"]
  const name = request.headers["x-user-name"]
  const email = request.headers["x-user-email"]
  if (typeof userId !== "string" || typeof email !== "string") return undefined
  return {
    userId,
    name: typeof name === "string" ? name : "",
    email,
    isAdmin: request.headers["x-user-is-admin"] === "true",
  }
}

export function requireUser(request: FastifyRequest, reply: FastifyReply): AuthUser | undefined {
  const user = getUser(request)
  if (!user) {
    reply.code(401).send({ message: "Unauthorized" })
    return undefined
  }
  return user
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (request.headers["x-user-is-admin"] !== "true") {
    reply.code(403).send({ message: "Admin access required" })
    return false
  }
  return true
}
