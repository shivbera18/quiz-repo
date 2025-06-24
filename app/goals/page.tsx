"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Target, Plus, Edit, Trash2, Trophy, Calendar, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Goal {
  id: string
  title: string
  description: string
  type: "score" | "attempts" | "streak" | "section"
  target: number
  current: number
  section?: string
  deadline: string
  status: "active" | "completed" | "expired"
  createdAt: string
}

interface QuizResult {
  _id: string
  date: string
  totalScore: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)

  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    type: "score" as Goal["type"],
    target: 0,
    section: "",
    deadline: "",
  })

  useEffect(() => {
    loadGoals()
    updateGoalProgress()
  }, [])

  const loadGoals = () => {
    const savedGoals = JSON.parse(localStorage.getItem("performanceGoals") || "[]")
    setGoals(savedGoals)
    setLoading(false)
  }

  const saveGoals = (updatedGoals: Goal[]) => {
    localStorage.setItem("performanceGoals", JSON.stringify(updatedGoals))
    setGoals(updatedGoals)
  }

  const updateGoalProgress = () => {
    const results: QuizResult[] = JSON.parse(localStorage.getItem("quizResults") || "[]")
    const savedGoals: Goal[] = JSON.parse(localStorage.getItem("performanceGoals") || "[]")

    const updatedGoals = savedGoals.map((goal) => {
      let current = 0

      switch (goal.type) {
        case "score":
          // Average score goal
          if (results.length > 0) {
            current = Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length)
          }
          break

        case "attempts":
          // Total attempts goal
          current = results.length
          break

        case "streak":
          // Consecutive days with quiz attempts
          current = calculateStreak(results)
          break

        case "section":
          // Section-specific average score
          if (results.length > 0 && goal.section) {
            const sectionScores = results
              .map((r) => r.sections[goal.section as keyof typeof r.sections])
              .filter((score) => score > 0)
            if (sectionScores.length > 0) {
              current = Math.round(sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length)
            }
          }
          break
      }

      // Update status
      let status: Goal["status"] = "active"
      if (current >= goal.target) {
        status = "completed"
      } else if (new Date() > new Date(goal.deadline)) {
        status = "expired"
      }

      return { ...goal, current, status }
    })

    saveGoals(updatedGoals)
  }

  const calculateStreak = (results: QuizResult[]) => {
    if (results.length === 0) return 0

    const sortedResults = results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const uniqueDates = [...new Set(sortedResults.map((r) => new Date(r.date).toDateString()))]

    let streak = 0
    let currentDate = new Date()

    for (const dateStr of uniqueDates) {
      const resultDate = new Date(dateStr)
      const daysDiff = Math.floor((currentDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === streak) {
        streak++
        currentDate = resultDate
      } else {
        break
      }
    }

    return streak
  }

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target || !newGoal.deadline) {
      alert("Please fill in all required fields")
      return
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      type: newGoal.type,
      target: newGoal.target,
      current: 0,
      section: newGoal.section || undefined,
      deadline: newGoal.deadline,
      status: "active",
      createdAt: new Date().toISOString(),
    }

    saveGoals([...goals, goal])
    setNewGoal({
      title: "",
      description: "",
      type: "score",
      target: 0,
      section: "",
      deadline: "",
    })
    setShowAddForm(false)
    updateGoalProgress()
  }

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      const updatedGoals = goals.filter((g) => g.id !== goalId)
      saveGoals(updatedGoals)
    }
  }

  const getGoalTypeLabel = (type: Goal["type"]) => {
    switch (type) {
      case "score":
        return "Average Score"
      case "attempts":
        return "Total Attempts"
      case "streak":
        return "Daily Streak"
      case "section":
        return "Section Score"
      default:
        return type
    }
  }

  const getProgressColor = (goal: Goal) => {
    const percentage = (goal.current / goal.target) * 100
    if (goal.status === "completed") return "bg-green-500"
    if (goal.status === "expired") return "bg-red-500"
    if (percentage >= 80) return "bg-blue-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-gray-500"
  }

  const activeGoals = goals.filter((g) => g.status === "active")
  const completedGoals = goals.filter((g) => g.status === "completed")
  const expiredGoals = goals.filter((g) => g.status === "expired")

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading goals...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Goals</h1>
              <p className="text-muted-foreground">Set and track your learning objectives</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGoals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedGoals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  goals.filter(
                    (g) =>
                      new Date(g.createdAt).getMonth() === new Date().getMonth() &&
                      new Date(g.createdAt).getFullYear() === new Date().getFullYear(),
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Goal Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Goal</CardTitle>
              <CardDescription>Set a new performance target to work towards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Achieve 85% average score"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Goal Type *</Label>
                  <Select
                    value={newGoal.type}
                    onValueChange={(value: Goal["type"]) => setNewGoal((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Average Score</SelectItem>
                      <SelectItem value="attempts">Total Attempts</SelectItem>
                      <SelectItem value="streak">Daily Streak</SelectItem>
                      <SelectItem value="section">Section Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target Value *</Label>
                  <Input
                    id="target"
                    type="number"
                    placeholder="e.g., 85"
                    value={newGoal.target || ""}
                    onChange={(e) => setNewGoal((prev) => ({ ...prev, target: Number.parseInt(e.target.value) || 0 }))}
                  />
                </div>

                {newGoal.type === "section" && (
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Select
                      value={newGoal.section}
                      onValueChange={(value) => setNewGoal((prev) => ({ ...prev, section: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reasoning">Reasoning</SelectItem>
                        <SelectItem value="quantitative">Quantitative</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal((prev) => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description or motivation for this goal"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddGoal}>Create Goal</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Lists */}
        {goals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No performance goals set yet</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Active Goals</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {activeGoals.map((goal) => (
                    <Card key={goal.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <CardDescription>{goal.description}</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditingGoal(goal)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">{getGoalTypeLabel(goal.type)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Due: {new Date(goal.deadline).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>
                                {goal.current} / {goal.target}
                                {goal.type === "score" || goal.type === "section" ? "%" : ""}
                              </span>
                            </div>
                            <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                          </div>

                          {goal.section && (
                            <Badge variant="secondary" className="text-xs">
                              {goal.section.charAt(0).toUpperCase() + goal.section.slice(1)} Section
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Completed Goals
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {completedGoals.map((goal) => (
                    <Card key={goal.id} className="border-green-200 dark:border-green-800">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {goal.title}
                              <Badge className="bg-green-500">Completed</Badge>
                            </CardTitle>
                            <CardDescription>{goal.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{getGoalTypeLabel(goal.type)}</span>
                            <span>
                              {goal.current} / {goal.target}
                              {goal.type === "score" || goal.type === "section" ? "%" : ""}
                            </span>
                          </div>
                          <Progress value={100} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Goals */}
            {expiredGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Expired Goals</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {expiredGoals.map((goal) => (
                    <Card key={goal.id} className="border-red-200 dark:border-red-800 opacity-75">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {goal.title}
                              <Badge variant="destructive">Expired</Badge>
                            </CardTitle>
                            <CardDescription>{goal.description}</CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{getGoalTypeLabel(goal.type)}</span>
                            <span>
                              {goal.current} / {goal.target}
                              {goal.type === "score" || goal.type === "section" ? "%" : ""}
                            </span>
                          </div>
                          <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
