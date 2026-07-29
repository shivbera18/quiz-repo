import type { FastifyRequest, FastifyReply } from "fastify"

// Same gateway header-trust pattern as catalog-svc/assessment-svc.
export function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (request.headers["x-user-is-admin"] !== "true") {
    reply.code(403).send({ message: "Admin access required" })
    return false
  }
  return true
}

export function getUserId(request: FastifyRequest): string | undefined {
  const id = request.headers["x-user-id"]
  return typeof id === "string" ? id : undefined
}
