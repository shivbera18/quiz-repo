// Internal HTTP calls backing the legacy (pre-Attempt) QuizResult reporting
// routes in legacy.ts. Before the service split this was a single Prisma
// include chain (QuizResult -> Quiz -> Chapter -> Subject, User); now it's
// two internal calls to the services that actually own that data. Fine at
// this data scale and QPS -- these are low-traffic admin/self reporting
// reads, not a hot path.
const IDENTITY_SVC_URL = process.env.IDENTITY_SVC_URL || "http://localhost:4001"
const CATALOG_SVC_URL = process.env.CATALOG_SVC_URL || "http://localhost:4002"

export interface LegacyUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: string
  createdAt: string
  lastLogin: string | null
}

export interface LegacyQuizMeta {
  id: string
  title: string
  questionCount: number
  isActive: boolean
  createdAt: string
  chapterId: string | null
  chapterName: string | null
  subjectId: string | null
  subjectName: string | null
  subjectIcon: string | null
  subjectColor: string | null
}

export async function fetchAllUsers(): Promise<LegacyUser[]> {
  const res = await fetch(`${IDENTITY_SVC_URL}/v1/internal/users`)
  if (!res.ok) throw new Error(`identity-svc returned ${res.status} fetching bulk users`)
  return (await res.json()) as LegacyUser[]
}

export async function fetchUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
  const res = await fetch(`${IDENTITY_SVC_URL}/v1/users/${userId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`identity-svc returned ${res.status} fetching user ${userId}`)
  return (await res.json()) as { id: string; name: string; email: string }
}

export async function fetchQuizMeta(): Promise<Map<string, LegacyQuizMeta>> {
  const res = await fetch(`${CATALOG_SVC_URL}/internal/quizzes-meta`)
  if (!res.ok) throw new Error(`catalog-svc returned ${res.status} fetching bulk quiz meta`)
  const rows = (await res.json()) as LegacyQuizMeta[]
  return new Map(rows.map((r) => [r.id, r]))
}
