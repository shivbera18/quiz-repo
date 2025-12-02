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
        <div className="flex flex-col gap-1">
          {/* Row 1: Heading - aligned with hamburger right edge */}
          <div className="flex items-center md:ml-0 ml-[52px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Analytics</h1>
          </div>
          {/* Row 2: Back button (same as hamburger) + Subheading */}
          <div className="flex items-center gap-2 md:ml-0 ml-2">
            <Link href="/dashboard" className="md:hidden">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-lg border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-yellow-300 dark:bg-yellow-400 hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="hidden md:block">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 shrink-0 border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-yellow-300 dark:bg-yellow-400 hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground font-medium">Detailed performance insights and progress tracking</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchData} 
          disabled={refreshing} 
          className="w-full sm:w-auto border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-blue-300 dark:bg-blue-400 hover:bg-blue-400 dark:hover:bg-blue-500 font-bold transition-all"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <StudentAnalytics results={results} />
    </div>
  )
}
