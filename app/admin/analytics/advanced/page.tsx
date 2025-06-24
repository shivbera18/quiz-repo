"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ArrowLeft,
  Users,
  BookOpen,
  TrendingUp,
  Target,
  Download,
  ChevronDown,
  ChevronUp,
  User,
  Award,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { useAuth } from "@/hooks/use-auth"

interface UserAnalytics {
  userId: string
  userName: string
  userEmail: string
  totalAttempts: number
  averageScore: number
  bestScore: number
  worstScore: number
  totalTimeSpent: number
  averageTimePerQuiz: number
  sectionPerformance: {
    reasoning: { total: number; correct: number; attempted: number; percentage: number }
    quantitative: { total: number; correct: number; attempted: number; percentage: number }
    english: { total: number; correct: number; attempted: number; percentage: number }
  }
  improvementTrend: number
  recentActivity: Array<{
    date: string
    quizTitle: string
    score: number
    timeSpent: number
  }>
  performanceHistory: Array<{
    date: string
    score: number
    quizId: string
    quizTitle: string
  }>
}

interface QuizAnalytics {
  quizId: string
  quizTitle: string
  totalQuestions: number
  totalAttempts: number
  averageScore: number
  bestScore: number
  worstScore: number
  passRate: number
  averageTime: number
  scoreDistribution: {
    excellent: number
    good: number
    average: number
    poor: number
  }
  sectionDifficulty: {
    reasoning: { totalQuestions: number; averageScore: number; attempts: number }
    quantitative: { totalQuestions: number; averageScore: number; attempts: number }
    english: { totalQuestions: number; averageScore: number; attempts: number }
  }
  recentAttempts: Array<{
    date: string
    userName: string
    userEmail: string
    score: number
    timeSpent: number
  }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

export default function AdvancedAnalyticsPage() {
  const { user, loading } = useAuth(true)
  const [analytics, setAnalytics] = useState<{
    overallStats: any
    userAnalytics: UserAnalytics[]
    quizAnalytics: QuizAnalytics[]
    timeAnalytics: any
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all")
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loading && user) {
      fetchAnalytics()
    }
  }, [loading, user])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = localStorage.getItem("token")

      const response = await fetch("/api/admin/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const data = await response.json()
      console.log("Fetched analytics data:", data)
      setAnalytics(data)
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const toggleQuizExpansion = (quizId: string) => {
    const newExpanded = new Set(expandedQuizzes)
    if (newExpanded.has(quizId)) {
      newExpanded.delete(quizId)
    } else {
      newExpanded.add(quizId)
    }
    setExpandedQuizzes(newExpanded)
  }

  const exportAnalytics = () => {
    if (!analytics) return

    const exportData = {
      generatedAt: new Date().toISOString(),
      overallStats: analytics.overallStats,
      userAnalytics: analytics.userAnalytics,
      quizAnalytics: analytics.quizAnalytics,
      timeAnalytics: analytics.timeAnalytics,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `advanced-analytics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg font-medium">Loading Advanced Analytics...</div>
          <div className="text-sm text-muted-foreground">Processing performance data</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="text-lg font-medium text-red-600">{error}</div>
          <Button onClick={fetchAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
          <div className="text-lg font-medium">No Analytics Data Available</div>
          <div className="text-sm text-muted-foreground">No quiz results found to analyze</div>
          <Button onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  const filteredUserAnalytics =
    selectedUser === "all" ? analytics.userAnalytics : analytics.userAnalytics.filter((u) => u.userId === selectedUser)

  const filteredQuizAnalytics =
    selectedQuiz === "all" ? analytics.quizAnalytics : analytics.quizAnalytics.filter((q) => q.quizId === selectedQuiz)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <Link href="/admin/analytics">
              <Button variant="outline" size="icon" className="hover:scale-105 transition-transform">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
              <p className="text-muted-foreground">Detailed user-wise and quiz-wise performance analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAnalytics} variant="outline" className="hover:scale-105 transition-transform">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <ThemeToggle />
            <Button onClick={exportAnalytics} className="hover:scale-105 transition-transform">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid md:grid-cols-5 gap-6 mb-8 animate-in slide-in-from-bottom duration-700">
          {[
            { title: "Total Users", value: analytics.overallStats.totalUsers, icon: Users, color: "text-blue-600" },
            {
              title: "Total Quizzes",
              value: analytics.overallStats.totalQuizzes,
              icon: BookOpen,
              color: "text-green-600",
            },
            {
              title: "Total Attempts",
              value: analytics.overallStats.totalAttempts,
              icon: TrendingUp,
              color: "text-purple-600",
            },
            {
              title: "Average Score",
              value: `${analytics.overallStats.averageScore}%`,
              icon: Target,
              color: "text-orange-600",
            },
            { title: "Pass Rate", value: `${analytics.overallStats.passRate}%`, icon: Award, color: "text-red-600" },
          ].map((stat, index) => (
            <Card key={stat.title} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-8 animate-in slide-in-from-left duration-500">
          <CardHeader>
            <CardTitle>Filters & Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="transition-all duration-200 hover:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users ({analytics.userAnalytics.length})</SelectItem>
                    {analytics.userAnalytics.map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        {user.userName} ({user.totalAttempts} attempts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Quiz</Label>
                <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                  <SelectTrigger className="transition-all duration-200 hover:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quizzes ({analytics.quizAnalytics.length})</SelectItem>
                    {analytics.quizAnalytics.map((quiz) => (
                      <SelectItem key={quiz.quizId} value={quiz.quizId}>
                        {quiz.quizTitle} ({quiz.totalAttempts} attempts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 animate-in slide-in-from-right duration-500">
            <TabsTrigger value="users" className="transition-all duration-200">
              User Analytics
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="transition-all duration-200">
              Quiz Analytics
            </TabsTrigger>
            <TabsTrigger value="trends" className="transition-all duration-200">
              Time Trends
            </TabsTrigger>
          </TabsList>

          {/* User Analytics Tab */}
          <TabsContent value="users" className="space-y-6">
            {filteredUserAnalytics.length === 0 ? (
              <Card className="animate-in fade-in duration-500">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No User Data Available</h3>
                  <p className="text-muted-foreground text-center">
                    No users have taken any quizzes yet. User analytics will appear here once quiz attempts are made.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredUserAnalytics.map((userAnalytic, index) => (
                  <Card
                    key={userAnalytic.userId}
                    className="animate-in slide-in-from-left duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Collapsible
                      open={expandedUsers.has(userAnalytic.userId)}
                      onOpenChange={() => toggleUserExpansion(userAnalytic.userId)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-all duration-200 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{userAnalytic.userName}</CardTitle>
                                <CardDescription>{userAnalytic.userEmail}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">{userAnalytic.totalAttempts} attempts</div>
                                <div className="text-sm text-muted-foreground">Avg: {userAnalytic.averageScore}%</div>
                              </div>
                              <Badge
                                variant={userAnalytic.improvementTrend >= 0 ? "default" : "destructive"}
                                className="transition-all duration-200 hover:scale-105"
                              >
                                {userAnalytic.improvementTrend >= 0 ? "+" : ""}
                                {userAnalytic.improvementTrend}%
                              </Badge>
                              <div className="transition-transform duration-200">
                                {expandedUsers.has(userAnalytic.userId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="animate-in slide-in-from-top duration-300">
                        <CardContent className="pt-0">
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                              { label: "Best Score", value: `${userAnalytic.bestScore}%`, color: "text-green-600" },
                              { label: "Worst Score", value: `${userAnalytic.worstScore}%`, color: "text-red-600" },
                              { label: "Total Time", value: `${userAnalytic.totalTimeSpent}m`, color: "text-blue-600" },
                              {
                                label: "Avg Time/Quiz",
                                value: `${userAnalytic.averageTimePerQuiz}m`,
                                color: "text-purple-600",
                              },
                            ].map((metric) => (
                              <Card key={metric.label} className="hover:shadow-md transition-all duration-200">
                                <CardContent className="p-4">
                                  <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Performance History Chart */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-base">Performance History</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {userAnalytic.performanceHistory.length > 0 ? (
                                  <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RechartsLineChart data={userAnalytic.performanceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="date"
                                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                        />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                          formatter={(value, name) => [`${value}%`, "Score"]}
                                        />
                                        <Line
                                          type="monotone"
                                          dataKey="score"
                                          stroke="#8884d8"
                                          strokeWidth={3}
                                          dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
                                          activeDot={{ r: 6, stroke: "#8884d8", strokeWidth: 2 }}
                                        />
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  </div>
                                ) : (
                                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                    No performance history available
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Section Performance */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-base">Section Performance</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {Object.entries(userAnalytic.sectionPerformance).map(([section, data]) => (
                                    <div key={section} className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="capitalize font-medium">{section}</span>
                                        <span className="text-sm">
                                          {data.percentage}% ({data.correct}/{data.total})
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                          style={{ width: `${data.percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Recent Activity */}
                          <Card className="mt-6 hover:shadow-lg transition-all duration-300">
                            <CardHeader>
                              <CardTitle className="text-base">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {userAnalytic.recentActivity.length > 0 ? (
                                <div className="space-y-2">
                                  {userAnalytic.recentActivity.map((activity, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-all duration-200"
                                    >
                                      <div>
                                        <div className="font-medium">{activity.quizTitle}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {new Date(activity.date).toLocaleDateString()}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <Badge
                                          variant={activity.score >= 70 ? "default" : "destructive"}
                                          className="mb-1"
                                        >
                                          {activity.score}%
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">{activity.timeSpent}m</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-4">
                                  No recent activity available
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quiz Analytics Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            {filteredQuizAnalytics.length === 0 ? (
              <Card className="animate-in fade-in duration-500">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Quiz Data Available</h3>
                  <p className="text-muted-foreground text-center">
                    No quizzes have been attempted yet. Quiz analytics will appear here once students start taking
                    quizzes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredQuizAnalytics.map((quizAnalytic, index) => (
                  <Card
                    key={quizAnalytic.quizId}
                    className="animate-in slide-in-from-right duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Collapsible
                      open={expandedQuizzes.has(quizAnalytic.quizId)}
                      onOpenChange={() => toggleQuizExpansion(quizAnalytic.quizId)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-all duration-200 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{quizAnalytic.quizTitle}</CardTitle>
                                <CardDescription>{quizAnalytic.totalQuestions} questions</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">{quizAnalytic.totalAttempts} attempts</div>
                                <div className="text-sm text-muted-foreground">Avg: {quizAnalytic.averageScore}%</div>
                              </div>
                              <Badge
                                variant={quizAnalytic.passRate >= 70 ? "default" : "destructive"}
                                className="transition-all duration-200 hover:scale-105"
                              >
                                {quizAnalytic.passRate}% pass rate
                              </Badge>
                              <div className="transition-transform duration-200">
                                {expandedQuizzes.has(quizAnalytic.quizId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="animate-in slide-in-from-top duration-300">
                        <CardContent className="pt-0">
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                              { label: "Best Score", value: `${quizAnalytic.bestScore}%`, color: "text-green-600" },
                              { label: "Worst Score", value: `${quizAnalytic.worstScore}%`, color: "text-red-600" },
                              { label: "Avg Time", value: `${quizAnalytic.averageTime}m`, color: "text-blue-600" },
                              { label: "Pass Rate", value: `${quizAnalytic.passRate}%`, color: "text-purple-600" },
                            ].map((metric) => (
                              <Card key={metric.label} className="hover:shadow-md transition-all duration-200">
                                <CardContent className="p-4">
                                  <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Score Distribution */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-base">Score Distribution</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {quizAnalytic.totalAttempts > 0 ? (
                                  <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Tooltip />
                                        <PieChart
                                          data={[
                                            {
                                              name: "Excellent (90-100%)",
                                              value: quizAnalytic.scoreDistribution.excellent,
                                            },
                                            { name: "Good (70-89%)", value: quizAnalytic.scoreDistribution.good },
                                            { name: "Average (50-69%)", value: quizAnalytic.scoreDistribution.average },
                                            { name: "Poor (<50%)", value: quizAnalytic.scoreDistribution.poor },
                                          ].filter((item) => item.value > 0)}
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={80}
                                          fill="#8884d8"
                                          dataKey="value"
                                        >
                                          {[
                                            {
                                              name: "Excellent (90-100%)",
                                              value: quizAnalytic.scoreDistribution.excellent,
                                            },
                                            { name: "Good (70-89%)", value: quizAnalytic.scoreDistribution.good },
                                            { name: "Average (50-69%)", value: quizAnalytic.scoreDistribution.average },
                                            { name: "Poor (<50%)", value: quizAnalytic.scoreDistribution.poor },
                                          ]
                                            .filter((item) => item.value > 0)
                                            .map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </PieChart>
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                ) : (
                                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                    No score distribution data available
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Section Difficulty */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-base">Section Difficulty Analysis</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {Object.entries(quizAnalytic.sectionDifficulty).map(([section, data]) => (
                                    <div key={section} className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="capitalize font-medium">{section}</span>
                                        <span className="text-sm">
                                          {data.averageScore}% avg ({data.totalQuestions} questions, {data.attempts}{" "}
                                          attempts)
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                          style={{ width: `${data.averageScore}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Recent Attempts */}
                          <Card className="mt-6 hover:shadow-lg transition-all duration-300">
                            <CardHeader>
                              <CardTitle className="text-base">Recent Attempts</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {quizAnalytic.recentAttempts.length > 0 ? (
                                <div className="space-y-2">
                                  {quizAnalytic.recentAttempts.map((attempt, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-all duration-200"
                                    >
                                      <div>
                                        <div className="font-medium">{attempt.userName}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {attempt.userEmail} • {new Date(attempt.date).toLocaleDateString()}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <Badge
                                          variant={attempt.score >= 70 ? "default" : "destructive"}
                                          className="mb-1"
                                        >
                                          {attempt.score}%
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">{attempt.timeSpent}m</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-4">
                                  No recent attempts available
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Time Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Daily Trends */}
              <Card className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-left duration-500">
                <CardHeader>
                  <CardTitle>Daily Activity Trends</CardTitle>
                  <CardDescription>Quiz attempts and average scores by day</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(analytics.timeAnalytics.daily).length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={Object.entries(analytics.timeAnalytics.daily)
                            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                            .map(([date, data]) => ({
                              date,
                              attempts: data.attempts,
                              averageScore: data.averageScore,
                            }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                          <YAxis />
                          <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                          <Area
                            type="monotone"
                            dataKey="attempts"
                            stackId="1"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No daily trend data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-right duration-500">
                <CardHeader>
                  <CardTitle>Monthly Performance Trends</CardTitle>
                  <CardDescription>Average scores and attempt counts by month</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(analytics.timeAnalytics.monthly).length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(analytics.timeAnalytics.monthly)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([month, data]) => ({
                              month,
                              attempts: data.attempts,
                              averageScore: data.averageScore,
                            }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="attempts" fill="#8884d8" />
                          <Bar dataKey="averageScore" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No monthly trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
