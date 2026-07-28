import { prisma } from "@/lib/prisma"

// Same token format and validation convention already used across the existing
// /api/results* routes (opaque `${userId}-${timestamp}-${random}` token, 30-day
// expiry, DB lookup). Consolidating the 9 pre-existing duplicates of this function
// into a single shared module is out of scope for this change (that's the Phase 2
// auth overhaul); this is just a single shared copy for the new /api/attempts*
// routes so they don't add yet another one.
export interface AuthenticatedUser {
  userId: string
  name: string
  email: string
  isAdmin: boolean
}

export async function validateToken(token: string): Promise<AuthenticatedUser> {
  const lastDashIndex = token.lastIndexOf("-")
  const secondLastDashIndex = token.lastIndexOf("-", lastDashIndex - 1)

  if (lastDashIndex === -1 || secondLastDashIndex === -1) {
    throw new Error("Invalid token format")
  }

  const userId = token.substring(0, secondLastDashIndex)
  const timestamp = parseInt(token.substring(secondLastDashIndex + 1, lastDashIndex))

  if (isNaN(timestamp)) {
    throw new Error("Invalid timestamp in token")
  }

  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days in ms
  if (Date.now() - timestamp > maxAge) {
    throw new Error("Token expired")
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new Error("User not found")
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  }
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized")
  }
  return validateToken(authHeader.substring(7))
}
