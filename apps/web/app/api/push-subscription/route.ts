import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/push-subscriptions")
}

export async function DELETE(request: NextRequest) {
  return proxyToGateway(request, "/v1/push-subscriptions")
}
