import { NextResponse, type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Admin result deletion over analytics-svc's derived AttemptFact rows.
// GET is not served here -- reads go through /api/admin/analytics.
export async function DELETE(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const id = params.get("id")
  const userId = params.get("userId")

  if (id) {
    // Delete from both analytics-svc (facts & stats) and assessment-svc (attempt).
    // Both endpoints are idempotent.
    const [analyticsRes] = await Promise.all([
      proxyToGateway(request, `/v1/analytics/attempts/${encodeURIComponent(id)}`),
      proxyToGateway(request, `/v1/admin/attempts/${encodeURIComponent(id)}`),
    ])
    if (analyticsRes.ok || analyticsRes.status === 404) {
      return NextResponse.json({ message: "Quiz result deleted successfully", deletedId: id })
    }
    return analyticsRes
  }
  if (userId) {
    const query = params.toString()
    const [analyticsRes] = await Promise.all([
      proxyToGateway(request, `/v1/analytics/users/${encodeURIComponent(userId)}/attempts${query ? `?${query}` : ""}`),
      proxyToGateway(request, `/v1/admin/legacy-results?${query}`),
    ])
    if (analyticsRes.ok || analyticsRes.status === 404) {
      return NextResponse.json({ message: "User results deleted successfully" })
    }
    return analyticsRes
  }
  return NextResponse.json({ message: "id or userId required" }, { status: 400 })
}
