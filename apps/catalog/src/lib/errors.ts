import { Prisma } from "../generated/prisma/index.js"
import type { FastifyReply } from "fastify"

// Catalog-svc's route-level error mapper. Route handlers wrap their bodies in
// try/catch and delegate here; anything this function does not map is
// rethrown so Fastify's own 500 path (and logging) stays authoritative.
//
// Validation itself never reaches this function -- routes validate via
// schema.safeParse and return 400 inline, matching the rest of the repo.
//
// Mappings:
//  - P2025 (record not found) -> 404: PUT/DELETE on a missing entity used to
//    escape as an unhandled Prisma error = 500
//  - P2002 (unique violation) -> 409: e.g. racing duplicate-name creates that
//    slipped past the findFirst pre-checks
//  - P2003 (foreign key violation) -> 400: creating/updating a quiz pointing
//    at a chapterId deleted between validation and write (previously 500)
export function handleCatalogError(error: unknown, reply: FastifyReply) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      reply.code(404)
      return { message: "Record not found (it may have been deleted)" }
    }
    if (error.code === "P2002") {
      reply.code(409)
      return { message: "A record with the same unique value already exists" }
    }
    if (error.code === "P2003") {
      reply.code(400)
      return { message: "Referenced record does not exist" }
    }
  }
  throw error
}
