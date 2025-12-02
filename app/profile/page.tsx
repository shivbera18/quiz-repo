"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, User, Trophy, Target, Clock, Star,
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

export default function ProfilePage() {
  const { user } = useAuth()
  const [selectedProfileTab, setSelectedProfileTab] = useState("achievements")
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalTimeSpent: 0,
    streakDays: 0,
    level: 1,
    experience: 0,
    badges: []
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
    const averageScore = parseFloat((results.reduce((sum: number, r: any) => sum + r.totalScore, 0) / totalQuizzes).toFixed(2))
    const bestScore = Math.max(...results.map((r: any) => r.totalScore))
    const totalTimeSpent = results.reduce((sum: number, r: any) => sum + (r.timeSpent || 0), 0)
    const experience = totalQuizzes * 10 + averageScore * 2
    const level = Math.floor(experience / 100) + 1

    const badges = []
    if (totalQuizzes >= 10) badges.push("Dedicated Learner")
    if (averageScore >= 80) badges.push("High Achiever")
    if (bestScore >= 95) badges.push("Perfectionist")

    setStats({
      totalQuizzes,
      averageScore,
      bestScore,
      totalTimeSpent,
      streakDays: 1,
      level,
      experience,
      badges
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
        id: "perfectionist",
        title: "Perfectionist",
        description: "Achieve a perfect score of 100%",
        icon: Award,
        unlocked: stats.bestScore >= 100,
        progress: stats.bestScore >= 100 ? 1 : 0,
        requirement: 1
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-lg h-11 w-11 border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-white dark:bg-zinc-900 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Your learning journey and achievements</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card variant="neobrutalist" className="md:col-span-1">
          <CardContent className="pt-6 text-center">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarFallback>
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-black mb-1">{user?.name || "Quiz Learner"}</h2>
            <p className="text-sm text-muted-foreground mb-3">{user?.email || "learner@quiz.com"}</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-black">Level {stats.level}</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Experience</span>
                  <span className="font-bold">{progressExp}/{requiredExp} XP</span>
                </div>
                <Progress value={(progressExp / requiredExp) * 100} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t">
                <div>
                  <div className="text-2xl font-black text-primary">{stats.totalQuizzes}</div>
                  <div className="text-xs font-bold">Quizzes</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-primary">{stats.averageScore}%</div>
                  <div className="text-xs font-bold">Avg Score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="neobrutalist" className="md:col-span-2">
          <Tabs value={selectedProfileTab} onValueChange={setSelectedProfileTab} className="p-6">
            {/* Mobile: Dropdown selector */}
            <div className="sm:hidden mb-6">
              <Select value={selectedProfileTab} onValueChange={setSelectedProfileTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievements">🏆 Achievements</SelectItem>
                  <SelectItem value="stats">📊 Quick Stats</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Desktop: Tab list */}
            <TabsList className="hidden sm:grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="stats">Quick Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements" className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-xl border ${achievement.unlocked
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/50 border-muted opacity-60'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                          <Icon className={`w-5 h-5 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{achievement.title}</h4>
                            {achievement.unlocked && (
                              <Badge className="text-xs h-5">✓</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          {!achievement.unlocked && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="text-muted-foreground">{achievement.progress}/{achievement.requirement}</span>
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
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                  <div className="p-2 rounded-lg bg-yellow-400 border-2 border-black">
                    <Trophy className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Best Score</p>
                    <p className="text-lg font-black">{stats.bestScore}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                  <div className="p-2 rounded-lg bg-blue-400 border-2 border-black">
                    <Clock className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Time Spent</p>
                    <p className="text-lg font-black">{Math.round(stats.totalTimeSpent / 60)}m</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                  <div className="p-2 rounded-lg bg-green-400 border-2 border-black">
                    <Calendar className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Current Streak</p>
                    <p className="text-lg font-black">{stats.streakDays} days</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                  <div className="p-2 rounded-lg bg-purple-400 border-2 border-black">
                    <Star className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Badges Earned</p>
                    <p className="text-lg font-black">{stats.badges.length}</p>
                  </div>
                </div>
              </div>

              {stats.badges.length > 0 && (
                <div className="p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
                  <h3 className="font-black mb-3 text-sm">Your Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.badges.map((badge, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
