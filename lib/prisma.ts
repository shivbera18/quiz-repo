// Re-export the shared Prisma client for convenient imports
// This ensures all API routes use the same connection pool

export { prisma, VercelPrismaClient } from './prisma-client'
