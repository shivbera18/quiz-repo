import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Admin analytics reads analytics-svc's rebuildable projections (AttemptFact,
// UserStats, DimUser) instead of the legacy pre-split QuizResult table, which
// new submissions never write.
export async function GET(request: NextRequest) {
  const scope = new URL(request.url).searchParams.get("scope") ?? "results"
  if (scope === "overview") {
    return proxyToGateway(request, "/v1/analytics/overview")
  }
  return proxyToGateway(request, "/v1/analytics/facts/results")
}
