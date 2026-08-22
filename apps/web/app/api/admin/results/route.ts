import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Admin result deletion over analytics-svc's derived AttemptFact rows.
// GET is not served here -- reads go through /api/admin/analytics.
export async function DELETE(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const id = params.get("id")
  const userId = params.get("userId")

  if (id) {
    return proxyToGateway(request, `/v1/admin/attempts/${encodeURIComponent(id)}`)
  }
  if (userId) {
    const query = params.toString()
    return proxyToGateway(request, `/v1/admin/users/${encodeURIComponent(userId)}/attempts${query ? `?${query}` : ""}`)
  }
  return Response.json({ message: "id or userId required" }, { status: 400 })
}
