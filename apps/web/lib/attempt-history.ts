// Single client for the student attempt-history surface. Every list that
// used to fetch /api/attempts then one /result per attempt (analytics,
// history, attempted-quizzes, dashboard recents) renders from this one
// call now -- rows are self-sufficient because assessment-svc persists
// scores AND the per-section breakdown at scoring time, and enriches with
// quiz metadata from catalog.
export interface AttemptSectionScore {
  section: string
  correct: number
  wrong: number
  unanswered: number
  total: number
  scorePct: number
  timeSpentMs: number
}

interface AttemptListRow {
  attemptId: string
  quizId: string
  status: string
  startedAt: string
  submittedAt: string | null
  totalScore: number | null
  rawScore: number | null
  maxScore: number | null
  correctCount: number | null
  wrongCount: number | null
  unansweredCount: number | null
  timeSpentMs: number | null
  sectionScores: AttemptSectionScore[] | null
  quizTitle: string | null
  chapterName: string | null
  subjectName: string | null
  subjectColor: string | null
}

export interface AttemptHistoryItem {
  _id: string
  id: string
  attemptId: string
  quizId: string
  quizName: string
  /** false when catalog could not provide a title (deleted quiz / outage) */
  quizNameKnown: boolean
  status: string
  startedAt: string
  date: string
  submittedAt: string | null
  totalScore: number
  rawScore: number | null
  maxScore: number | null
  correctAnswers: number
  correctCount: number | null
  wrongAnswers: number
  wrongCount: number | null
  unanswered: number
  unansweredCount: number | null
  /** seconds -- matches the shape legacy result objects used */
  timeSpent: number
  timeSpentMs: number | null
  sections: Record<string, number>
  sectionScores: AttemptSectionScore[] | null
  chapterName: string | null
  subjectName: string | null
  subjectColor: string | null
}

const FALLBACK_QUIZ_NAME = "Unknown Quiz"

function toItem(row: AttemptListRow): AttemptHistoryItem {
  const sections: Record<string, number> = {}
  for (const s of row.sectionScores ?? []) sections[s.section] = s.scorePct
  return {
    _id: row.attemptId,
    id: row.attemptId,
    attemptId: row.attemptId,
    quizId: row.quizId,
    quizName: row.quizTitle ?? FALLBACK_QUIZ_NAME,
    quizNameKnown: row.quizTitle !== null,
    status: row.status,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    date: row.submittedAt ?? row.startedAt,
    totalScore: row.totalScore ?? 0,
    rawScore: row.rawScore,
    maxScore: row.maxScore,
    correctAnswers: row.correctCount ?? 0,
    correctCount: row.correctCount,
    wrongAnswers: row.wrongCount ?? 0,
    wrongCount: row.wrongCount,
    unanswered: row.unansweredCount ?? 0,
    unansweredCount: row.unansweredCount,
    timeSpent: Math.round((row.timeSpentMs ?? 0) / 1000),
    timeSpentMs: row.timeSpentMs,
    sections,
    sectionScores: row.sectionScores,
    chapterName: row.chapterName,
    subjectName: row.subjectName,
    subjectColor: row.subjectColor,
  }
}

export async function fetchAttemptHistory(
  token: string,
  opts: { status?: string; limit?: number; cursor?: string } = {}
): Promise<AttemptHistoryItem[]> {
  const params = new URLSearchParams()
  if (opts.status) params.set("status", opts.status)
  if (opts.limit) params.set("limit", String(opts.limit))
  if (opts.cursor) params.set("cursor", opts.cursor)
  const response = await fetch(`/api/attempts${params.size ? `?${params}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token || "student-token-placeholder"}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
  if (!response.ok) throw new Error(`Failed to fetch attempts (${response.status})`)
  const data = await response.json()
  return ((data.attempts ?? []) as AttemptListRow[]).map(toItem)
}
