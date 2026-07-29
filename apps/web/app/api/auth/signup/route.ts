import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/auth/signup")
}
