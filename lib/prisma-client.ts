// Vercel-optimized Prisma client with connection pooling and error handling
import { PrismaClient } from "@/lib/generated/prisma"

// Global variable to store the Prisma instance for reuse across function invocations
declare global {
  var prisma: PrismaClient | undefined
}

class VercelPrismaClient {
  private static instance: PrismaClient | null = null;
  
  static getInstance(): PrismaClient {
    // In development, use a global variable to prevent multiple instances
    if (process.env.NODE_ENV === "development") {
      if (!global.prisma) {
        global.prisma = new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
        });
      }
      return global.prisma;
    }
    
    // In production (Vercel), create a new instance for each request
    // but reuse if already exists in this function execution
    if (!VercelPrismaClient.instance) {
      VercelPrismaClient.instance = new PrismaClient({
        log: ['error'], // Only log errors in production
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
    }
    
    return VercelPrismaClient.instance;
  }
  
  static async disconnect() {
    if (VercelPrismaClient.instance) {
      await VercelPrismaClient.instance.$disconnect();
      VercelPrismaClient.instance = null;
    }
    
    if (global.prisma) {
      await global.prisma.$disconnect();
      global.prisma = undefined;
    }
  }
  
  static async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const client = VercelPrismaClient.getInstance();
      
      // Test basic connection
      await client.$connect();
      
      // Test a simple query
      await client.$queryRaw`SELECT 1`;
      
      return { success: true };
    } catch (error) {
      console.error('Prisma connection test failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          code: (error as any)?.code,
          meta: (error as any)?.meta,
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }
}

// Export the singleton instance
export const prisma = VercelPrismaClient.getInstance();
export { VercelPrismaClient };

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await VercelPrismaClient.disconnect();
  });
}
