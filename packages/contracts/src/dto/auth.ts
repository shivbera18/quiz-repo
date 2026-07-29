import { z } from "zod"

// Auth intentionally stays on the pre-existing opaque token scheme
// (`${userId}-${timestamp}-${random}`, plaintext password compare) rather than
// the RS256/argon2 design ARCHITECTURE.md's Phase 2 describes -- that overhaul
// was explicitly deferred. identity-svc is still its own service (blast-radius
// isolation: it's the only process touching the users table), it just doesn't
// change what a "session" is.

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  userType: z.enum(["student", "admin"]),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const signupRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})
export type SignupRequest = z.infer<typeof signupRequestSchema>

export interface AuthUserDTO {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: string
}

export interface AuthResponseDTO {
  token: string
  user: AuthUserDTO
}

// What the gateway gets back from identity-svc's internal token-introspection
// endpoint. Cached in Redis (see packages/redis-kit) so the gateway isn't
// making this call on every single request.
export interface TokenIntrospectionDTO {
  valid: boolean
  userId?: string
  name?: string
  email?: string
  isAdmin?: boolean
}
