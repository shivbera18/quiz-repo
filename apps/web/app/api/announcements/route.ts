import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return proxyToGateway(request, "/v1/announcements")
}

// Admin creation lives on /v1/admin/announcements; the page POSTs here.
export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/admin/announcements")
}
