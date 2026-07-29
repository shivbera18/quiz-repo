"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import {
  Trophy, TrendingUp, TrendingDown, Target, Clock, BookOpen,
  Activity, Users, Menu
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface QuizResult {
  _id: string
  date: string
  quizName: string
  totalScore: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
  sections: {
    reasoning?: number
    quantitative?: number
    english?: number
  }
  user?: {
    id: string
    name: string
    email: string
  }
  userId?: string
}

interface AdvancedAnalyticsProps {
  results?: QuizResult[]
  currentUserId?: string
  isStudentMode?: boolean
}

const COLORS = ['#000000', '#666666', '#999999', '#CCCCCC']
const DARK_COLORS = ['#FFFFFF', '#AAAAAA', '#666666', '#333333']

export default function AdvancedAnalytics({ results = [], currentUserId, isStudentMode = false }: AdvancedAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState<string>("performance")

  // Extract unique users from results
  const uniqueUsers = results.reduce((acc, result) => {
    const userId = result.userId || result.user?.id
    const userName = result.user?.name || result.user?.email || `User ${userId?.slice(0, 8)}`
    if (userId && !acc.find(u => u.id === userId)) {
      acc.push({ id: userId, name: userName })
    }
    return acc
  }, [] as { id: string; name: string }[])

  // Auto-select current user in student mode
  useEffect(() => {
    if (isStudentMode && currentUserId) {
      setSelectedUserId(currentUserId)
    }
  }, [isStudentMode, currentUserId])

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Complete some quizzes to see your performance insights.</p>
      </div>
    )
  }

  // Filter results
  const filteredResults = results.filter(result => {
    if (selectedPeriod === 'all') return true
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return new Date(result.date) >= cutoffDate
  }).filter(result => {
    if (selectedUserId === 'all') return true
    return result.userId === selectedUserId || result.user?.id === selectedUserId
  })

  if (filteredResults.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Data Found</h3>
        <p className="text-muted-foreground">No results found for the selected filters.</p>
      </div>
    )
  }

  // Calculate Metrics
  const totalQuizzes = filteredResults.length
  const averageScore = Math.round(filteredResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuizzes)
  const totalCorrect = filteredResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0)
  const totalQuestions = filteredResults.reduce((sum, r) => sum + (r.correctAnswers || 0) + (r.wrongAnswers || 0) + (r.unanswered || 0), 0)
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const averageTime = Math.round(filteredResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / totalQuizzes / 60)

  // Charts Data
  const performanceTrend = filteredResults
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r, i) => ({
      name: `Quiz ${i + 1}`,
      score: r.totalScore,
      accuracy: r.correctAnswers / (r.correctAnswers + r.wrongAnswers + r.unanswered) * 100
    }))

  const sectionData = ['reasoning', 'quantitative', 'english'].map(section => {
    const sectionScores = filteredResults
      .map(r => r.sections?.[section as keyof typeof r.sections])
      .filter(s => s !== undefined) as number[]

    const avg = sectionScores.length > 0
      ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length)
      : 0

    return { name: section.charAt(0).toUpperCase() + section.slice(1), score: avg }
  })

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(period => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              {period === 'all' ? 'All Time' : period}
            </Button>
          ))}
        </div>
        {!isStudentMode && (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users ({uniqueUsers.length})</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuizzes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageTime}m</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Charts */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        {/* Mobile: Dropdown selector */}
        <div className="sm:hidden">
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">📈 Performance</SelectItem>
              <SelectItem value="sections">📚 Sections</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Desktop: Tab list */}
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score Progression</CardTitle>
              <CardDescription>Your performance over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Analysis</CardTitle>
              <CardDescription>Average score per section.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
