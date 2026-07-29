import type { FastifyRequest, FastifyReply } from "fastify"

// This service trusts x-user-id / x-user-is-admin headers attached by the
// gateway after IT validates the caller's token against identity-svc. No
// Bearer-token parsing happens here -- see ARCHITECTURE.md's gateway section
// and the note in each route file for why.
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
