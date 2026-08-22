import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Per-user performance for the admin analytics modal, served from
// analytics-svc's UserStats projection (rebuildable, event-fed).
export async function GET(request: NextRequest) {
  const userId = new URL(request.url).searchParams.get("userId")
  if (!userId) {
    return Response.json({ message: "User ID required" }, { status: 400 })
  }
  return proxyToGateway(request, `/v1/analytics/users/${encodeURIComponent(userId)}`)
}
