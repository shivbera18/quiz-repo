"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import StudentAnalytics from "@/components/student-analytics"
import { useAuth } from "@/hooks/use-auth"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/analytics?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` }
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      } else {
        const fallbackRes = await fetch(`/api/results?_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` }
        })
        const fallbackData = await fallbackRes.json()
        setResults(fallbackData.results || [])
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed performance insights and progress tracking</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={refreshing} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <StudentAnalytics results={results} />
    </div>
  )
}
