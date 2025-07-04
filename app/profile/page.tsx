"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, User, Trophy, Target, Clock, Brain, Star, 
  Calendar, TrendingUp, Award, BookOpen, Zap, Shield
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface UserStats {
  totalQuizzes: number
  averageScore: number
  bestScore: number
  totalTimeSpent: number
  streakDays: number
  level: number
  experience: number
  badges: string[]
  lastActive: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: any
  unlocked: boolean
  progress: number
  requirement: number
}

interface ActivityItem {
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
  timeAgo: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0,
    streakDays: 0,
    level: 1,
    experience: 0,
    badges: [],
    lastActive: new Date().toISOString()
  })
  
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    calculateUserStats()
    calculateAchievements()
  }, [])

  const calculateUserStats = () => {
    if (typeof window === 'undefined') return
    
    const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
    
    if (results.length === 0) return

    const totalQuizzes = results.length
    const averageScore = Math.round(results.reduce((sum: number, r: any) => sum + r.totalScore, 0) / totalQuizzes)
    const bestScore = Math.max(...results.map((r: any) => r.totalScore))
    const totalTimeSpent = results.reduce((sum: number, r: any) => sum + (r.timeSpent || 0), 0)
    
    // Calculate streak (simplified - consecutive days with quizzes)
    const sortedDates = results
      .map((r: any) => new Date(r.date).toDateString())
      .filter((date: string, index: number, arr: string[]) => arr.indexOf(date) === index)
      .sort()
    
    let streakDays = 0
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    
    if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
      streakDays = 1
      // Could implement more complex streak calculation
    }

    // Calculate level and experience
    const experience = totalQuizzes * 10 + averageScore * 2
    const level = Math.floor(experience / 100) + 1

    // Determine badges
    const badges = []
    if (totalQuizzes >= 10) badges.push("Dedicated Learner")
    if (averageScore >= 80) badges.push("High Achiever")
    if (bestScore >= 95) badges.push("Perfectionist")
    if (streakDays >= 3) badges.push("Consistent")
    if (totalQuizzes >= 50) badges.push("Quiz Master")

    setStats({
      totalQuizzes,
      averageScore,
      bestScore,
      totalTimeSpent,
      streakDays,
      level,
      experience,
      badges,
      lastActive: new Date().toISOString()
    })
  }

  const calculateAchievements = () => {
    if (typeof window === 'undefined') return
    
    const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
    
    const achievementsList: Achievement[] = [
      {
        id: "first_quiz",
        title: "Getting Started",
        description: "Complete your first quiz",
        icon: BookOpen,
        unlocked: results.length >= 1,
        progress: Math.min(results.length, 1),
        requirement: 1
      },
      {
        id: "quiz_streak_3",
        title: "Building Momentum",
        description: "Take quizzes for 3 consecutive days",
        icon: Calendar,
        unlocked: stats.streakDays >= 3,
        progress: Math.min(stats.streakDays, 3),
        requirement: 3
      },
      {
        id: "high_score",
        title: "Excellence",
        description: "Achieve a score of 90% or higher",
        icon: Trophy,
        unlocked: stats.bestScore >= 90,
        progress: Math.min(stats.bestScore, 90),
        requirement: 90
      },
      {
        id: "quiz_master",
        title: "Quiz Master",
        description: "Complete 25 quizzes",
        icon: Star,
        unlocked: stats.totalQuizzes >= 25,
        progress: Math.min(stats.totalQuizzes, 25),
        requirement: 25
      },
      {
        id: "speed_demon",
        title: "Speed Demon",
        description: "Complete a quiz in under 10 minutes with 80%+ score",
        icon: Zap,
        unlocked: results.some((r: any) => r.timeSpent < 600 && r.totalScore >= 80),
        progress: results.some((r: any) => r.timeSpent < 600 && r.totalScore >= 80) ? 1 : 0,
        requirement: 1
      },
      {
        id: "perfectionist",
        title: "Perfectionist",
        description: "Achieve a perfect score of 100%",
        icon: Award,
        unlocked: stats.bestScore >= 100,
        progress: stats.bestScore >= 100 ? 1 : 0,
        requirement: 1
      },
      {
        id: "dedicated",
        title: "Dedicated Learner",
        description: "Complete 50 quizzes",
        icon: Brain,
        unlocked: stats.totalQuizzes >= 50,
        progress: Math.min(stats.totalQuizzes, 50),
        requirement: 50
      },
      {
        id: "consistent",
        title: "Consistency Champion",
        description: "Maintain 75%+ average score over 10 quizzes",
        icon: Target,
        unlocked: stats.totalQuizzes >= 10 && stats.averageScore >= 75,
        progress: stats.totalQuizzes >= 10 ? Math.min(stats.averageScore, 75) : 0,
        requirement: 75
      }
    ]

    setAchievements(achievementsList)
  }

  const getExperienceToNextLevel = () => {
    const currentLevelExp = (stats.level - 1) * 100
    const nextLevelExp = stats.level * 100
    const progressExp = stats.experience - currentLevelExp
    const requiredExp = nextLevelExp - currentLevelExp
    return { progressExp, requiredExp }
  }

  const { progressExp, requiredExp } = getExperienceToNextLevel()

  const getRecentActivity = (): ActivityItem[] => {
    if (typeof window === 'undefined') return []
    
    const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
    return results
      .slice(-5)
      .reverse()
      .map((result: any) => ({
        ...result,
        date: new Date(result.date).toLocaleDateString(),
        timeAgo: getTimeAgo(new Date(result.date))
      }))
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const recentActivity = getRecentActivity()

  return (
    <div className="min-h-screen neu-surface">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="neu-card p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Link href="/dashboard">
                  <button className="neu-icon-button p-2">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Link>
                <div className="neu-icon-button p-2">
                  <ThemeToggle />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold neu-text-gradient break-words">Profile</h1>
              <p className="text-muted-foreground text-sm mt-1 break-words">Your learning journey and achievements</p>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <div className="neu-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/dashboard">
                    <button className="neu-icon-button p-3">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </Link>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold neu-text-gradient">Profile</h1>
                    <p className="text-muted-foreground text-sm lg:text-base">Your learning journey and achievements</p>
                  </div>
                </div>
                <div className="neu-icon-button p-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* User Info Card */}
            <div className="neu-card p-6 text-center">
              <Avatar className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-4">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback>
                  <User className="w-10 sm:w-12 h-10 sm:h-12" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg sm:text-xl font-bold neu-text-gradient mb-1">{user?.name || "Quiz Learner"}</h2>
              <p className="text-muted-foreground text-sm mb-3">{user?.email || "learner@quiz.com"}</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Level {stats.level}</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Experience</span>
                    <span>{progressExp}/{requiredExp} XP</span>
                  </div>
                  <Progress value={(progressExp / requiredExp) * 100} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalQuizzes}</div>
                    <div className="text-xs text-muted-foreground">Quizzes</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">{stats.averageScore}%</div>
                    <div className="text-xs text-muted-foreground">Avg Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="neu-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Badges Earned</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.badges.length > 0 ? stats.badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )) : (
                  <p className="text-sm text-muted-foreground">No badges earned yet. Keep quizzing!</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="neu-card p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Best Score</span>
                  </div>
                  <span className="font-medium">{stats.bestScore}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">Time Spent</span>
                  </div>
                  <span className="font-medium">{Math.round(stats.totalTimeSpent / 60)}m</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Current Streak</span>
                  </div>
                  <span className="font-medium">{stats.streakDays} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="achievements" className="space-y-4 sm:space-y-6">
              {/* Mobile Dropdown for tabs */}
              <div className="sm:hidden">
                <select 
                  className="neu-input w-full p-3 text-sm"
                  onChange={(e) => {
                    // Handle tab change for mobile
                    const value = e.target.value;
                    document.querySelector(`[data-state="active"]`)?.setAttribute('data-state', 'inactive');
                    document.querySelector(`[value="${value}"]`)?.setAttribute('data-state', 'active');
                  }}
                >
                  <option value="achievements">Achievements</option>
                  <option value="activity">Recent Activity</option>
                </select>
              </div>
              
              {/* Desktop TabsList */}
              <div className="hidden sm:block">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="achievements" className="space-y-4 sm:space-y-6">
                <div className="neu-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Achievements</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    Track your progress and unlock new achievements
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon
                      return (
                        <div
                          key={achievement.id}
                          className={`neu-input-surface p-4 rounded-lg ${
                            achievement.unlocked 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                              : 'opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              achievement.unlocked ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                achievement.unlocked ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{achievement.title}</h4>
                                {achievement.unlocked && (
                                  <Badge variant="secondary" className="text-xs">Unlocked</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {achievement.description}
                              </p>
                              {!achievement.unlocked && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Progress</span>
                                    <span>{achievement.progress}/{achievement.requirement}</span>
                                  </div>
                                  <Progress 
                                    value={(achievement.progress / achievement.requirement) * 100} 
                                    className="h-1"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                <div className="neu-card p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    Your latest quiz attempts and performance
                  </p>
                  <div>
                    {recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((activity: ActivityItem, index: number) => (
                          <div key={index} className="neu-input-surface p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{activity.quizName}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Score: {activity.totalScore}% • {activity.timeAgo}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <Badge 
                                  variant={activity.totalScore >= 80 ? "default" : activity.totalScore >= 60 ? "secondary" : "destructive"}
                                >
                                  {activity.totalScore}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No recent activity. Take a quiz to get started!</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
