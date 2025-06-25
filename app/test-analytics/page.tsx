// Test page to isolate the advanced analytics user selection issue
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const mockResults = [
  {
    _id: 'test-1',
    date: new Date().toISOString(),
    quizName: 'Test Quiz 1',
    quizId: 'quiz-1',
    totalScore: 75,
    rawScore: 75,
    positiveMarks: 15,
    negativeMarks: 0,
    correctAnswers: 15,
    wrongAnswers: 5,
    unanswered: 0,
    sections: { reasoning: 75, quantitative: 80, english: 70 },
    answers: [],
    timeSpent: 1800,
    negativeMarking: false,
    negativeMarkValue: 0,
    user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    quiz: { id: 'quiz-1', title: 'Test Quiz 1' }
  },
  {
    _id: 'test-2',
    date: new Date().toISOString(),
    quizName: 'Test Quiz 2',
    quizId: 'quiz-2',
    totalScore: 85,
    rawScore: 85,
    positiveMarks: 17,
    negativeMarks: 0,
    correctAnswers: 17,
    wrongAnswers: 3,
    unanswered: 0,
    sections: { reasoning: 85, quantitative: 90, english: 80 },
    answers: [],
    timeSpent: 1600,
    negativeMarking: false,
    negativeMarkValue: 0,
    user: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
    quiz: { id: 'quiz-2', title: 'Test Quiz 2' }
  }
];

export default function TestAdvancedAnalytics() {
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  // Extract users
  const users = Array.from(new Set(mockResults.map(r => r.user?.id)))
    .map(id => {
      const result = mockResults.find(r => r.user?.id === id);
      return result?.user;
    })
    .filter((user): user is { id: string; name: string; email: string; } => !!user);

  // Filter results
  const userFilteredResults = mockResults.filter(result => {
    if (selectedUserId === 'all') return true;
    return result.user?.id === selectedUserId;
  });

  console.log('Selected user:', selectedUserId)
  console.log('Filtered results:', userFilteredResults.length)

  const handleUserChange = (value: string) => {
    try {
      console.log('Changing user to:', value)
      setSelectedUserId(value)
      setError(null)
    } catch (error) {
      console.error('Error changing user:', error)
      setError('Error selecting user')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Advanced Analytics Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Selection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select User:</label>
              <Select onValueChange={handleUserChange} value={selectedUserId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <p><strong>Selected:</strong> {selectedUserId}</p>
              <p><strong>Total Users:</strong> {users.length}</p>
              <p><strong>Filtered Results:</strong> {userFilteredResults.length}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Results:</h3>
              {userFilteredResults.map(result => (
                <div key={result._id} className="border p-2 rounded mb-2">
                  <p><strong>Quiz:</strong> {result.quizName}</p>
                  <p><strong>User:</strong> {result.user?.name}</p>
                  <p><strong>Score:</strong> {result.totalScore}%</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
