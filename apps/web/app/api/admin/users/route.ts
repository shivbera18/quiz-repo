import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Admin user management reads analytics-svc's DimUser + UserStats projections
// (fed by USER_CHANGED / ATTEMPT_SUBMITTED events) instead of the legacy
// pre-split QuizResult join, which new submissions never write.
export async function GET(request: NextRequest) {
  return proxyToGateway(request, "/v1/analytics/facts/users")
}
