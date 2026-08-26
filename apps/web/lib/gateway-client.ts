// apps/web is UI-only now -- every app/api/** route handler in this app is a
// thin forward to the gateway (Fastify, apps/gateway) instead of touching
// Prisma/Redis/Kafka directly. This is the one place that builds the
// forwarded request; every route.ts file just calls proxyToGateway with the
// gateway-side path.
import { NextRequest, NextResponse } from "next/server"

const GATEWAY_URL = (process.env.GATEWAY_URL || "http://localhost:4000").trim()

// Hard ceiling on one upstream round trip. Without it, a hung gateway
// (crashed but connection-accepting, or wedged behind a stuck downstream)
// holds the Next.js route handler open indefinitely -- the client browser
// request eventually times out on its own while the server-side handler and
// its socket stay pinned. Generous enough that legitimate slow endpoints
// (CSV export polling is fast; AI generation is async via jobs) never hit it.
const UPSTREAM_TIMEOUT_MS = Number(process.env.GATEWAY_TIMEOUT_MS || 30_000)

export async function proxyToGateway(request: NextRequest, gatewayPath: string): Promise<NextResponse> {
  const incomingUrl = new URL(request.url)
  const target = `${GATEWAY_URL}${gatewayPath}${incomingUrl.search}`

  const headers = new Headers()
  const auth = request.headers.get("authorization") || request.headers.get("x-quiz-authorization")
  if (auth) headers.set("authorization", auth)
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("content-type", contentType)

  const hasBody = !["GET", "HEAD"].includes(request.method)
  const body = hasBody ? await request.text() : undefined

  // AbortSignal.timeout aborts both the connection phase and a stalled body
  // read; undici surfaces it as a TimeoutError (a DOMException), which maps
  // to 504 so callers can distinguish "gateway slow/down" from other errors.
  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.error(`gateway proxy: ${request.method} ${target} timed out after ${UPSTREAM_TIMEOUT_MS}ms`)
      return NextResponse.json({ message: "Gateway timeout" }, { status: 504 })
    }
    console.error(`gateway proxy: failed to reach ${target}:`, err)
    return NextResponse.json({ message: "Upstream service unavailable" }, { status: 503 })
  }

  const responseBody = await upstream.text()
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  })
}
