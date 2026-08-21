// apps/web is UI-only now -- every app/api/** route handler in this app is a
// thin forward to the gateway (Fastify, apps/gateway) instead of touching
// Prisma/Redis/Kafka directly. This is the one place that builds the
// forwarded request; every route.ts file just calls proxyToGateway with the
// gateway-side path.
import { NextRequest, NextResponse } from "next/server"

const GATEWAY_URL = (process.env.GATEWAY_URL || "http://localhost:4000").trim()

export async function proxyToGateway(request: NextRequest, gatewayPath: string): Promise<NextResponse> {
  const incomingUrl = new URL(request.url)
  const target = `${GATEWAY_URL}${gatewayPath}${incomingUrl.search}`

  const headers = new Headers()
  const auth = request.headers.get("authorization") || request.headers.get("x-authorization")
  if (auth) headers.set("authorization", auth)
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)

  const hasBody = !["GET", "HEAD"].includes(request.method)
  const body = hasBody ? await request.text() : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" })
  } catch (err) {
    console.error(`gateway proxy: failed to reach ${target}:`, err)
    return NextResponse.json({ message: "Upstream service unavailable" }, { status: 503 })
  }

  const responseBody = await upstream.text()
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  })
}
