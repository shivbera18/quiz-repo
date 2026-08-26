"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { MobilePageHeader } from "@/components/layout/mobile-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookMarked, Brain, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from "lucide-react"

// Shape mirrors assessment's NotebookItem (content frozen at capture time).
interface NotebookEntry {
  id: string
  quizId: string
  questionId: string
  kind: "WRONG_ANSWER" | "BOOKMARK"
  section: string
  questionText: string
  options: string[]
  correctAnswer: number
  explanation: string
  selectedAnswer: number | null
  boxLevel: number
  nextPracticeAt: string
}

type Tab = "WRONG_ANSWER" | "BOOKMARK"

const BOX_LABELS = ["", "Box 1 · daily", "Box 2 · every 1d", "Box 3 · every 3d", "Box 4 · weekly", "Box 5 · mastery"]

function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export default function NotebookPage() {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<Tab>("WRONG_ANSWER")
  const [items, setItems] = useState<NotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Practice mode state: queue of due entries + the one being answered.
  const [practicing, setPracticing] = useState(false)
  const [queue, setQueue] = useState<NotebookEntry[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [done, setDone] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/notebook?kind=${tab}&limit=200`, {
        headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` },
      })
      if (!res.ok) throw new Error("Failed to load notebook")
      const data = await res.json()
      setItems((data.items ?? []) as NotebookEntry[])
    } catch (err) {
      console.error(err)
      setError("Could not load your notebook.")
    } finally {
      setLoading(false)
    }
  }, [user, tab])

  useEffect(() => {
    if (!authLoading) void load()
  }, [authLoading, load])

  const dueCount = useMemo(() => items.filter((i) => new Date(i.nextPracticeAt).getTime() <= Date.now()).length, [items])

  const startPractice = () => {
    const due = items.filter((i) => new Date(i.nextPracticeAt).getTime() <= Date.now())
    setQueue(due.length > 0 ? due : [...items].sort((a, b) => a.boxLevel - b.boxLevel).slice(0, 10))
    setPicked(null)
    setDone(0)
    setPracticing(true)
  }

  const current = queue[0]

  const submitPracticeAnswer = async (choice: number) => {
    if (!current || !user || picked !== null) return
    setPicked(choice)
    const correct = choice === current.correctAnswer
    setDone((d) => d + 1)
    try {
      await fetch(`/api/notebook/${current.id}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ correct }),
      })
    } catch (err) {
      console.warn("Outcome not recorded:", err)
    }
  }

  const nextInQueue = async () => {
    setPicked(null)
    setQueue((q) => q.slice(1))
    if (queue.length <= 1) {
      setPracticing(false)
      await load()
    }
  }

  const removeBookmark = async (questionId: string) => {
    if (!user) return
    setItems((prev) => prev.filter((i) => i.questionId !== questionId))
    try {
      await fetch(`/api/notebook/bookmarks?questionId=${encodeURIComponent(questionId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` },
      })
    } catch (err) {
      console.warn("Bookmark removal failed server-side:", err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (practicing && current) {
    const answered = picked !== null
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 mobile-header-safe-zone">
        <MobilePageHeader title="Practice" subtitle={`${done} answered · ${queue.length} in queue`} backHref="/dashboard/notebook" />
        <Card variant="neobrutalist">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge className="border-2 border-black bg-purple-200 text-black font-bold">{current.section}</Badge>
              <span className="text-xs font-bold text-muted-foreground">{BOX_LABELS[current.boxLevel] ?? `Box ${current.boxLevel}`}</span>
            </div>
            <CardTitle className="text-base font-bold pt-2">{current.questionText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {parseOptions(current.options).map((option, idx) => {
              const isCorrectOption = idx === current.correctAnswer
              const isPicked = picked === idx
              let tone = "bg-card hover:bg-accent"
              if (answered && isCorrectOption) tone = "bg-green-200 dark:bg-green-900/40"
              else if (answered && isPicked) tone = "bg-red-200 dark:bg-red-900/40"
              return (
                <button
                  key={idx}
                  disabled={answered}
                  onClick={() => submitPracticeAnswer(idx)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 border-black dark:border-white/65 font-semibold transition-colors ${tone}`}
                >
                  <span className="mr-2 font-black">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                  {answered && isCorrectOption && <CheckCircle2 className="inline h-4 w-4 ml-2 text-green-700" />}
                  {answered && isPicked && !isCorrectOption && <XCircle className="inline h-4 w-4 ml-2 text-red-700" />}
                </button>
              )
            })}

            {answered && current.explanation && (
              <div className="mt-3 p-3 rounded-lg bg-muted text-sm font-medium">{current.explanation}</div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setPracticing(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> End session
              </Button>
              {answered && (
                <Button variant="neobrutalist" size="sm" className="font-bold" onClick={() => void nextInQueue()}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 mobile-header-safe-zone">
      <MobilePageHeader
        title="Notebook"
        subtitle="Wrong answers to master and questions you saved"
        backHref="/dashboard"
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button
          variant={tab === "WRONG_ANSWER" ? "neobrutalist" : "outline"}
          size="sm"
          className="font-bold"
          onClick={() => setTab("WRONG_ANSWER")}
        >
          <XCircle className="h-4 w-4 mr-1" /> Wrong answers ({tab === "WRONG_ANSWER" ? items.length : ""})
        </Button>
        <Button
          variant={tab === "BOOKMARK" ? "neobrutalist" : "outline"}
          size="sm"
          className="font-bold"
          onClick={() => setTab("BOOKMARK")}
        >
          <BookMarked className="h-4 w-4 mr-1" /> Bookmarks ({tab === "BOOKMARK" ? items.length : ""})
        </Button>
        <Button size="sm" className="ml-auto font-bold" onClick={startPractice} disabled={items.length === 0}>
          <Brain className="h-4 w-4 mr-1" /> Practice {dueCount > 0 ? `(${dueCount} due)` : ""}
        </Button>
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      {!error && items.length === 0 && (
        <Card variant="neobrutalist">
          <CardContent className="py-10 text-center text-muted-foreground font-medium">
            {tab === "WRONG_ANSWER"
              ? "Nothing here yet — wrong answers appear automatically after you submit a quiz."
              : "No bookmarks yet. Save questions from any result page."}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const dueNow = new Date(item.nextPracticeAt).getTime() <= Date.now()
          return (
            <Card key={item.id} variant="neobrutalist">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <Badge className="border-2 border-black bg-purple-200 text-black font-bold">{item.section}</Badge>
                    <span className="text-xs font-bold text-muted-foreground">{BOX_LABELS[item.boxLevel] ?? `Box ${item.boxLevel}`}</span>
                    {dueNow ? (
                      <Badge className="border-2 border-black bg-yellow-300 text-black font-bold">Due</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Next: {new Date(item.nextPracticeAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {item.kind === "BOOKMARK" && (
                    <Button variant="ghost" size="sm" className="font-bold text-red-600" onClick={() => void removeBookmark(item.questionId)}>
                      Remove
                    </Button>
                  )}
                </div>
                <CardTitle className="text-sm font-bold pt-1">{item.questionText}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">
                  Correct: {String.fromCharCode(65 + item.correctAnswer)}. {parseOptions(item.options)[item.correctAnswer]}
                </p>
                {item.explanation && <p className="text-xs mt-2 text-muted-foreground font-medium line-clamp-2">{item.explanation}</p>}
                <Link href={`/quiz/${item.quizId}`} className="text-xs font-bold underline mt-2 inline-block">
                  Revisit quiz
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
