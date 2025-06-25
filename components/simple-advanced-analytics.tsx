"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  answers: Array<any>
  timeSpent: number
  negativeMarking: boolean
  negativeMarkValue: number
  user?: {
    id: string
    name: string
    email: string
  }
  quiz?: {
    id: string
    title: string
  }
}

interface SimpleAdvancedAnalyticsProps {
  results: QuizResult[]
}

export default function SimpleAdvancedAnalytics({ results = [] }: SimpleAdvancedAnalyticsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')

  console.log('SimpleAdvancedAnalytics: Received', results.length, 'results')

  // Early validation
  if (!Array.isArray(results)) {
    return <div className="p-8 text-center text-red-600">Invalid data format</div>
  }

  if (results.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No analytics data available</div>
  }

  // Extract users safely
  const users = Array.from(new Set(results.map(r => r.user?.id).filter(Boolean)))
    .map(id => results.find(r => r.user?.id === id)?.user)
    .filter(user => user && user.id && user.name) as Array<{ id: string; name: string; email: string }>

  console.log('Extracted users:', users.length)

  // Filter results
  const filteredResults = results.filter(result => {
    if (selectedUserId === 'all') return true
    return result.user?.id === selectedUserId
  })

  console.log('Filtered results for user', selectedUserId, ':', filteredResults.length)

  // Simple calculations
  const totalQuizzes = filteredResults.length
  const averageScore = totalQuizzes > 0 ? 
    Math.round(filteredResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuizzes) : 0
  const totalCorrect = filteredResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0)

  const handleUserChange = (value: string) => {
    console.log('User selection changing from', selectedUserId, 'to', value)
    try {
      setSelectedUserId(value)
      console.log('Successfully changed to:', value)
    } catch (error) {
      console.error('Error changing user:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with User Selection */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Simple Advanced Analytics</h2>
        <Select onValueChange={handleUserChange} value={selectedUserId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users ({results.length})</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Selected User:</strong> {selectedUserId}</p>
            <p><strong>Total Results:</strong> {results.length}</p>
            <p><strong>Filtered Results:</strong> {filteredResults.length}</p>
            <p><strong>Available Users:</strong> {users.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Basic Stats */}
      {filteredResults.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalQuizzes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{averageScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Correct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCorrect}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              No data available for selected user: {selectedUserId}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {filteredResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>Showing {filteredResults.length} results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredResults.slice(0, 10).map(result => (
                <div key={result._id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{result.quizName}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.user?.name} • {new Date(result.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{result.totalScore}%</div>
                      <div className="text-sm text-muted-foreground">
                        {result.correctAnswers}✓ {result.wrongAnswers}✗ {result.unanswered}—
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
