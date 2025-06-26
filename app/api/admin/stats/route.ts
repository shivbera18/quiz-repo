import { type NextRequest, NextResponse } from "next/server"

// Mock data
const users = [

// Force this route to be dynamic (not statically rendered)
export const dynamic = 'force-dynamic'
  { id: "1", name: "Admin User", email: "admin@example.com", isAdmin: true },
  { id: "2", name: "Test User", email: "user@example.com", isAdmin: false },
]

const results: any[] = []

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation (in production, use proper JWT verification)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // For demo purposes, assume valid token means admin access
    const stats = {
      totalUsers: users.filter((u) => !u.isAdmin).length,
      totalAttempts: results.length,
      sectionStats: {
        reasoning: results.filter((r) => r.sections?.reasoning).length,
        quantitative: results.filter((r) => r.sections?.quantitative).length,
        english: results.filter((r) => r.sections?.english).length,
      },
    }

    return NextResponse.json({ stats })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
