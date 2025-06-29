export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: {
      region: process.env.VERCEL_REGION || 'unknown',
      url: process.env.VERCEL_URL || 'unknown'
    },
    database: {
      hasUrl: !!process.env.DATABASE_URL,
      urlLength: process.env.DATABASE_URL?.length || 0,
      urlStart: process.env.DATABASE_URL?.substring(0, 50) + '...' || 'none',
      urlEnd: '...' + process.env.DATABASE_URL?.substring(process.env.DATABASE_URL.length - 30) || 'none'
    }
  })
}
