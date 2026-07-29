import type { FullQuizDTO } from "@quiz/contracts"

// Replaces the monolith's local `prisma.quiz.findUnique` -- assessment-svc has
// no DB access to catalog's schema at all (enforced by the Postgres role
// grants, not just this file). This is the ONE internal call assessment-svc
// makes to catalog-svc, made once at attempt-start; after that everything
// scoring-related reads from the AttemptSnapshot this response gets stored into.
const CATALOG_SVC_URL = process.env.CATALOG_SVC_URL || "http://localhost:4002"

export async function fetchFullQuiz(quizId: string): Promise<FullQuizDTO | null> {
  const res = await fetch(`${CATALOG_SVC_URL}/internal/quizzes/${quizId}/full`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`catalog-svc returned ${res.status} fetching quiz ${quizId}`)
  }
  return (await res.json()) as FullQuizDTO
}
