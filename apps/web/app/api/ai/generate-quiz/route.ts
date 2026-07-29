import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

// This used to create the quiz synchronously in the request. catalog-svc's
// version is async (202 + jobId, generated section-by-section by a Kafka
// worker with partial-progress persistence -- the actual fix for the old
// bug where a single failed section discarded every question already
// generated). Poll GET /api/ai/generate-quiz/:jobId for status.
//
// Known gap: catalog-svc's AiGenerationJob doesn't yet carry
// chapterId/duration/negativeMarking through to the generated quiz (it
// lands with defaults and no chapter assignment) -- fixing that needs a
// small schema addition, not just this proxy. Flagged, not silently dropped.
export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/ai/quiz-generations")
}
