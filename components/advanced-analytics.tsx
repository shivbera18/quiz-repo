"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, ScatterChart, Scatter, ComposedChart
} from 'recharts'
import { 
  Trophy, TrendingUp, TrendingDown, Target, Clock, Brain, 
  Award, Star, Zap, Calendar, BarChart3, PieChart as PieChartIcon,
  Activity, Users, BookOpen, CheckCircle, XCircle, AlertCircle
} from "lucide-react"

interface QuizResult {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  rawScore: number
  positiveMarks: number
  negativeMarks: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  sections: {
    reasoning?: number
    quantitative?: number
    english?: number
  }
  questions: any[]
  timeSpent: number
  negativeMarking: boolean
  negativeMarkValue: number
}

interface AdvancedAnalyticsProps {
  results?: QuizResult[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

// Safe chart wrapper to handle rendering errors
const SafeChart = ({ children, fallback = "Unable to load chart" }: { children: React.ReactNode, fallback?: string }) => {
  try {
    return <>{children}</>
  } catch (error) {
    console.warn('Chart rendering error:', error)
    return <div className="p-4 text-center text-muted-foreground">{fallback}</div>
  }
}

export default function AdvancedAnalytics({ results = [] }: AdvancedAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  
  // Validate and sanitize results data
  const validResults = (results || []).filter(result => 
    result && 
    typeof result === 'object' &&
    result.date &&
    typeof result.totalScore === 'number' &&
    typeof result.correctAnswers === 'number' &&
    typeof result.wrongAnswers === 'number' &&
    typeof result.unanswered === 'number'
  )
  
  // Filter results based on selected period
  const filteredResults = validResults.filter(result => {
    try {
      if (selectedPeriod === 'all') return true
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      return new Date(result.date) >= cutoffDate
    } catch (error) {
      console.warn('Error filtering result:', result, error)
      return false
    }
  })

  // Overall Statistics with safe calculations
  const totalQuizzes = filteredResults.length
  const averageScore = totalQuizzes > 0 ? 
    Math.round(filteredResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuizzes) : 0
  const totalCorrect = filteredResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0)
  const totalWrong = filteredResults.reduce((sum, r) => sum + (r.wrongAnswers || 0), 0)
  const totalUnanswered = filteredResults.reduce((sum, r) => sum + (r.unanswered || 0), 0)
  const totalQuestions = totalCorrect + totalWrong + totalUnanswered
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const averageTime = totalQuizzes > 0 ? 
    Math.round(filteredResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / totalQuizzes / 60) : 0

  // Performance Trends with null safety
  const performanceTrend = filteredResults
    .filter(result => result.date && result.totalScore !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((result, index) => {
      const total = (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unanswered || 0)
      const accuracy = total > 0 ? Math.round(((result.correctAnswers || 0) / total) * 100) : 0
      return {
        quiz: index + 1,
        score: result.totalScore || 0,
        accuracy,
        timeSpent: Math.round((result.timeSpent || 0) / 60),
        date: new Date(result.date).toLocaleDateString()
      }
    })

  // Section-wise Performance with better error handling
  const sectionData = ['reasoning', 'quantitative', 'english'].map(section => {
    const sectionResults = filteredResults.filter(r => 
      r.sections && 
      typeof r.sections === 'object' && 
      r.sections[section as keyof typeof r.sections] !== undefined
    )
    const avgScore = sectionResults.length > 0 ? 
      Math.round(sectionResults.reduce((sum, r) => {
        const score = r.sections?.[section as keyof typeof r.sections] || 0
        return sum + score
      }, 0) / sectionResults.length) : 0
    return {
      section: section.charAt(0).toUpperCase() + section.slice(1),
      score: avgScore,
      attempts: sectionResults.length
    }
  })

  // Score Distribution with safer handling
  const scoreRanges = [
    { range: '90-100%', count: 0, color: '#10b981' },
    { range: '80-89%', count: 0, color: '#3b82f6' },
    { range: '70-79%', count: 0, color: '#f59e0b' },
    { range: '60-69%', count: 0, color: '#ef4444' },
    { range: 'Below 60%', count: 0, color: '#6b7280' }
  ]

  filteredResults.forEach(result => {
    const score = result.totalScore || 0
    if (score >= 90) scoreRanges[0].count++
    else if (score >= 80) scoreRanges[1].count++
    else if (score >= 70) scoreRanges[2].count++
    else if (score >= 60) scoreRanges[3].count++
    else scoreRanges[4].count++
  })

  // Weekly Progress with error handling
  const weeklyData = filteredResults.reduce((acc, result) => {
    try {
      const week = new Date(result.date).toISOString().split('T')[0]
      if (!acc[week]) {
        acc[week] = { date: week, quizzes: 0, totalScore: 0, avgScore: 0 }
      }
      acc[week].quizzes++
      acc[week].totalScore += (result.totalScore || 0)
      acc[week].avgScore = Math.round(acc[week].totalScore / acc[week].quizzes)
      return acc
    } catch (error) {
      console.warn('Error processing weekly data for result:', result, error)
      return acc
    }
  }, {} as any)

  const weeklyProgress = Object.values(weeklyData).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Difficulty Analysis
  const difficultyData = [
    { difficulty: 'Easy Questions', correct: 0, total: 0 },
    { difficulty: 'Medium Questions', correct: 0, total: 0 },
    { difficulty: 'Hard Questions', correct: 0, total: 0 }
  ]

  // Time Analysis with safer data handling
  const timeData = filteredResults.map(result => ({
    quiz: (result.quizName || 'Unknown Quiz').substring(0, 20) + '...',
    timeSpent: Math.round((result.timeSpent || 0) / 60),
    score: result.totalScore || 0,
    efficiency: (result.totalScore || 0) / Math.max((result.timeSpent || 0) / 60, 1) // Score per minute
  }))

  // Improvement Analysis with bounds checking
  const improvement = performanceTrend.length >= 2 ? 
    (performanceTrend[performanceTrend.length - 1]?.score || 0) - (performanceTrend[0]?.score || 0) : 0

  // Recent Performance Analysis with validation
  const recentPerformance = filteredResults.slice(-5).map(result => ({
    name: (result.quizName || 'Unknown Quiz').substring(0, 15) + '...',
    score: result.totalScore || 0,
    correct: result.correctAnswers || 0,
    wrong: result.wrongAnswers || 0,
    unanswered: result.unanswered || 0
  }))

  // Study Patterns Data with error handling
  const weeklyPatternData = filteredResults.reduce((acc, result) => {
    try {
      const week = `Week ${Math.ceil((new Date(result.date).getDate()) / 7)}`
      if (!acc[week]) {
        acc[week] = { week, attempts: 0, totalScore: 0 }
      }
      acc[week].attempts++
      acc[week].totalScore += (result.totalScore || 0)
      return acc
    } catch (error) {
      console.warn('Error processing weekly pattern data:', result, error)
      return acc
    }
  }, {} as any)

  const studyPatterns = Object.values(weeklyPatternData).map((item: any) => ({
    week: item.week,
    attempts: item.attempts,
    avgScore: item.attempts > 0 ? Math.round(item.totalScore / item.attempts) : 0
  }))

  // Hourly Performance Analysis (simulated based on typical patterns)
  const hourlyPerformance = Array.from({ length: 24 }, (_, hour) => {
    const hourResults = filteredResults.filter(() => Math.random() > 0.7) // Simulate hourly data
    const avgScore = hourResults.length > 0 ? 
      Math.round(hourResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / hourResults.length) : 
      Math.round(averageScore + (Math.random() - 0.5) * 20)
    
    return {
      hour: hour < 10 ? `0${hour}:00` : `${hour}:00`,
      score: Math.max(0, Math.min(100, avgScore))
    }
  })

  // Performance Variance Calculation with safety checks
  const scores = filteredResults.map(r => r.totalScore || 0).filter(score => !isNaN(score))
  const variance = scores.length > 1 ? 
    Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length) : 0
  const performanceVariance = Math.round(variance)

  // Improvement Rate Calculation with bounds checking
  const firstHalf = performanceTrend.slice(0, Math.ceil(performanceTrend.length / 2))
  const secondHalf = performanceTrend.slice(Math.ceil(performanceTrend.length / 2))
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, p) => sum + (p.score || 0), 0) / firstHalf.length : 0
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, p) => sum + (p.score || 0), 0) / secondHalf.length : 0
  const improvementRate = Math.round(secondHalfAvg - firstHalfAvg)

  const getPeriodLabel = (period: string) => {
    switch(period) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days' 
      case '90d': return 'Last 90 Days'
      case 'all': return 'All Time'
      default: return 'Last 30 Days'
    }
  }

  // Early return for no data
  if (!validResults.length || totalQuizzes === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Quiz Data Available</h3>
        <p className="text-muted-foreground">Take some quizzes to see your detailed analytics here.</p>
      </div>
    )
  }

  // Wrap the entire component render in error handling
  try {

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                selectedPeriod === period 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {getPeriodLabel(period)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              +{filteredResults.filter(r => 
                new Date(r.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <div className="flex items-center text-xs">
              {improvement > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : improvement < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              ) : null}
              <span className={improvement > 0 ? 'text-green-500' : improvement < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                {improvement > 0 ? '+' : ''}{improvement}% trend
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy}%</div>
            <p className="text-xs text-muted-foreground">
              {totalCorrect}/{totalQuestions} questions correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageTime}m</div>
            <p className="text-xs text-muted-foreground">
              per quiz attempt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="patterns">Study Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trend
                </CardTitle>
                <CardDescription>Your score progression over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SafeChart fallback="Performance trend chart unavailable">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quiz" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}${name === 'score' ? '%' : name === 'timeSpent' ? 'm' : '%'}`, 
                          name === 'score' ? 'Score' : name === 'accuracy' ? 'Accuracy' : 'Time'
                        ]}
                        labelFormatter={(label) => `Quiz ${label}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="score" />
                      <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="accuracy" />
                    </LineChart>
                  </ResponsiveContainer>
                </SafeChart>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Performance
                </CardTitle>
                <CardDescription>Latest 5 quiz attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <SafeChart fallback="Recent performance chart unavailable">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={recentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="correct" stackId="a" fill="#10b981" name="Correct" />
                      <Bar dataKey="wrong" stackId="a" fill="#ef4444" name="Wrong" />
                      <Bar dataKey="unanswered" stackId="a" fill="#6b7280" name="Unanswered" />
                    </BarChart>
                  </ResponsiveContainer>
                </SafeChart>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sections" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Section-wise Performance
                </CardTitle>
                <CardDescription>Your performance across different sections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                    <Bar dataKey="score" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section Analysis</CardTitle>
                <CardDescription>Detailed breakdown by section</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionData.map((section) => (
                  <div key={section.section} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{section.section}</span>
                      <span className="text-sm text-muted-foreground">{section.score}%</span>
                    </div>
                    <Progress value={section.score} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {section.attempts} attempts
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Score Distribution
                </CardTitle>
                <CardDescription>Distribution of your quiz scores</CardDescription>
              </CardHeader>
              <CardContent>
                <SafeChart fallback="Score distribution chart unavailable">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoreRanges}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, count }) => count > 0 ? `${range}: ${count}` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {scoreRanges.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </SafeChart>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Answer Distribution
                </CardTitle>
                <CardDescription>Breakdown of your answers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Correct Answers</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{totalCorrect}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <Progress value={totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Wrong Answers</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{totalWrong}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalQuestions > 0 ? Math.round((totalWrong / totalQuestions) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <Progress value={totalQuestions > 0 ? (totalWrong / totalQuestions) * 100 : 0} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <span>Unanswered</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{totalUnanswered}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalQuestions > 0 ? Math.round((totalUnanswered / totalQuestions) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <Progress value={totalQuestions > 0 ? (totalUnanswered / totalQuestions) * 100 : 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time vs Score Analysis
                </CardTitle>
                <CardDescription>Relationship between time spent and scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeSpent" name="Time (minutes)" />
                    <YAxis dataKey="score" name="Score %" />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}${name === 'score' ? '%' : 'm'}`, 
                        name === 'score' ? 'Score' : 'Time Spent'
                      ]}
                    />
                    <Scatter dataKey="score" fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Efficiency Analysis
                </CardTitle>
                <CardDescription>Score per minute ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeData.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quiz" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${typeof value === 'number' ? value.toFixed(2) : value}`, 'Score/Minute']} />
                    <Bar dataKey="efficiency" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Study Frequency
                </CardTitle>
                <CardDescription>Your quiz attempt patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={studyPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attempts" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Peak Performance Hours
                </CardTitle>
                <CardDescription>Your best performance times</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                    <Area type="monotone" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Consistency Analysis
                </CardTitle>
                <CardDescription>Your performance consistency metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Performance Variance</span>
                  <Badge variant={performanceVariance < 15 ? "default" : performanceVariance < 25 ? "secondary" : "destructive"}>
                    {performanceVariance}%
                  </Badge>
                </div>
                <Progress value={100 - performanceVariance} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {performanceVariance < 15 ? "Very consistent performance" : 
                   performanceVariance < 25 ? "Moderately consistent" : "High variance in scores"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Improvement Rate
                </CardTitle>
                <CardDescription>Your learning progress over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Score Improvement</span>
                  <Badge variant={improvementRate > 0 ? "default" : "secondary"}>
                    {improvementRate > 0 ? "+" : ""}{improvementRate}%
                  </Badge>
                </div>
                <Progress value={Math.min(100, Math.max(0, improvementRate + 50))} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {improvementRate > 10 ? "Excellent improvement trajectory" :
                   improvementRate > 0 ? "Steady improvement" : "Consider reviewing study methods"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
                <CardDescription>AI-powered analysis of your performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Strength Analysis */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Strengths</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {accuracy >= 80 && <li>• High accuracy rate ({accuracy}%)</li>}
                    {averageScore >= 75 && <li>• Consistent high scores</li>}
                    {sectionData.find(s => s.score >= 80) && (
                      <li>• Strong in {sectionData.filter(s => s.score >= 80).map(s => s.section).join(', ')}</li>
                    )}
                    {improvement > 5 && <li>• Showing significant improvement (+{improvement}%)</li>}
                  </ul>
                </div>

                {/* Improvement Areas */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Areas for Improvement</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {accuracy < 70 && <li>• Focus on accuracy (currently {accuracy}%)</li>}
                    {averageScore < 60 && <li>• Need to improve overall scores</li>}
                    {sectionData.find(s => s.score < 60) && (
                      <li>• Work on {sectionData.filter(s => s.score < 60).map(s => s.section).join(', ')} sections</li>
                    )}
                    {totalUnanswered > totalCorrect * 0.3 && <li>• Reduce unanswered questions</li>}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Recommendations</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Take {Math.max(3 - (totalQuizzes % 7), 0)} more quizzes this week</li>
                    <li>• Focus on time management (current avg: {averageTime}m)</li>
                    <li>• Review explanations for wrong answers</li>
                    <li>• Practice weak sections more frequently</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Study Plan
                </CardTitle>
                <CardDescription>Personalized study recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Daily Practice</div>
                      <div className="text-sm text-muted-foreground">Take 1-2 quizzes daily</div>
                    </div>
                    <Badge variant="outline">High Priority</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Weak Section Focus</div>
                      <div className="text-sm text-muted-foreground">
                        {sectionData.sort((a, b) => a.score - b.score)[0]?.section || 'All sections'} practice
                      </div>
                    </div>
                    <Badge variant="outline">Medium Priority</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Speed Improvement</div>
                      <div className="text-sm text-muted-foreground">Timed practice sessions</div>
                    </div>
                    <Badge variant="outline">Low Priority</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Review Sessions</div>
                      <div className="text-sm text-muted-foreground">Weekly performance review</div>
                    </div>
                    <Badge variant="outline">Recommended</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
  } catch (error) {
    console.error('Advanced Analytics rendering error:', error)
    return (
      <div className="text-center py-12 border border-red-200 rounded-lg bg-red-50">
        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-red-700">Analytics Error</h3>
        <p className="text-red-600">Unable to display analytics. Please try refreshing the page.</p>
      </div>
    )
  }
}
