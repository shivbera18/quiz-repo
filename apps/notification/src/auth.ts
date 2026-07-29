import type { FastifyRequest, FastifyReply } from "fastify"

// Same gateway header-trust pattern as the other services.
export interface AuthUser {
  userId: string
  name: string
  isAdmin: boolean
}

export function getUser(request: FastifyRequest): AuthUser | undefined {
  const userId = request.headers["x-user-id"]
  if (typeof userId !== "string") return undefined
  const name = request.headers["x-user-name"]
  return { userId, name: typeof name === "string" ? name : "", isAdmin: request.headers["x-user-is-admin"] === "true" }
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
