"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Calendar, Flame, Clock, Target, TrendingUp } from "lucide-react"

interface ActivityDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4 // Activity intensity levels
}

interface ActivityCalendarProps {
  attempts: Array<{
    date: string
    totalScore: number
    quizName: string
  }>
}

export function ActivityCalendar({ attempts }: ActivityCalendarProps) {
  const [activityData, setActivityData] = useState<ActivityDay[]>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  useEffect(() => {
    if (!attempts.length) return

    // Generate last 365 days
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)

    const days: ActivityDay[] = []
    const attemptsByDate = new Map<string, number>()

    // Count attempts per day
    attempts.forEach(attempt => {
      const date = new Date(attempt.date).toDateString()
      attemptsByDate.set(date, (attemptsByDate.get(date) || 0) + 1)
    })

    // Create activity data for each day
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toDateString()
      const count = attemptsByDate.get(dateKey) || 0
      
      // Determine activity level (0-4 based on number of attempts)
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count >= 5) level = 4
      else if (count >= 3) level = 3
      else if (count >= 2) level = 2
      else if (count >= 1) level = 1

      days.push({
        date: new Date(d).toISOString().split('T')[0],
        count,
        level
      })
    }

    setActivityData(days)

    // Calculate streaks
    let current = 0
    let longest = 0
    let tempStreak = 0

    // Check from today backwards for current streak
    const todayStr = today.toDateString()
    let checkDate = new Date(today)
    
    while (checkDate >= oneYearAgo) {
      const dateStr = checkDate.toDateString()
      if (attemptsByDate.has(dateStr)) {
        current++
        tempStreak++
        longest = Math.max(longest, tempStreak)
      } else {
        if (dateStr === todayStr) {
          // If today has no activity, current streak is 0
          current = 0
        }
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Calculate longest streak in the entire period
    tempStreak = 0
    for (const day of days) {
      if (day.count > 0) {
        tempStreak++
        longest = Math.max(longest, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    setCurrentStreak(current)
    setLongestStreak(longest)
  }, [attempts])

  const getActivityColor = (level: number) => {
    switch (level) {
      case 0: return "bg-gray-100 dark:bg-gray-800"
      case 1: return "bg-green-200 dark:bg-green-900"
      case 2: return "bg-green-300 dark:bg-green-700"
      case 3: return "bg-green-500 dark:bg-green-600"
      case 4: return "bg-green-600 dark:bg-green-500"
      default: return "bg-gray-100 dark:bg-gray-800"
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMonthLabels = () => {
    const months = []
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push(date.toLocaleDateString('en-US', { month: 'short' }))
    }
    return months
  }

  const getWeekDays = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Organize data into weeks starting from Sunday
  const organizeIntoWeeks = () => {
    if (!activityData.length) return []
    
    const weeks = []
    const startDate = new Date(activityData[0].date)
    const startDayOfWeek = startDate.getDay() // 0 = Sunday
    
    // Add empty cells for the first week if it doesn't start on Sunday
    let currentWeek = Array(startDayOfWeek).fill(null)
    
    activityData.forEach((day, index) => {
      currentWeek.push(day)
      
      // If we've filled a week (7 days) or reached the end
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })
    
    // Fill the last week if incomplete
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }
    
    return weeks
  }

  const weeks = organizeIntoWeeks()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Activity Calendar</CardTitle>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">Current:</span>
              <Badge variant="outline" className="text-orange-600">
                {currentStreak} days
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Best:</span>
              <Badge variant="outline" className="text-green-600">
                {longestStreak} days
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription>
          Your quiz attempt activity over the past year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month labels - Hidden on mobile for cleaner look */}
          <div className="hidden sm:flex justify-between text-xs text-muted-foreground px-3">
            {getMonthLabels().map((month, index) => (
              <span key={index}>{month}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max pb-2">
              {/* Day labels column */}
              <div className="flex flex-col justify-between text-xs text-muted-foreground pt-1 mr-1">
                {getWeekDays().map((day, index) => (
                  <div key={index} className="h-3 flex items-center">
                    <span className="hidden sm:inline">{index % 2 === 1 ? day : ''}</span>
                    <span className="sm:hidden">{index % 2 === 1 ? day.charAt(0) : ''}</span>
                  </div>
                ))}
              </div>

              {/* Activity grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={`empty-${weekIndex}-${dayIndex}`} className="w-3 h-3"></div>
                      }
                      
                      return (
                        <TooltipProvider key={day.date}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-3 h-3 rounded-sm ${getActivityColor(day.level)} cursor-pointer hover:ring-2 hover:ring-green-400 transition-all`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">{formatDate(day.date)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {day.count === 0 ? 'No activity' : `${day.count} quiz${day.count === 1 ? '' : 's'} attempted`}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total attempts: {attempts.length}
            </div>
          </div>

          {/* Recent Activities Carousel */}
          {attempts.length > 0 && (
            <div className="pt-6 border-t mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm">Recent Activity</h4>
                </div>
                {attempts.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    Showing 10 of {attempts.length}
                  </Badge>
                )}
              </div>
              
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                  skipSnaps: false,
                  dragFree: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {attempts.slice(0, 10).map((attempt, index) => {
                    const attemptDate = new Date(attempt.date)
                    const isToday = attemptDate.toDateString() === new Date().toDateString()
                    const isYesterday = attemptDate.toDateString() === new Date(Date.now() - 86400000).toDateString()
                    
                    let dateDisplay = attemptDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                    if (isToday) dateDisplay = 'Today'
                    else if (isYesterday) dateDisplay = 'Yesterday'

                    return (
                      <CarouselItem key={index} className="pl-2 md:pl-4 basis-48 sm:basis-56">
                        <Card className="h-full hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {dateDisplay}
                                </span>
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    attempt.totalScore >= 80 ? 'bg-green-500' :
                                    attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} />
                                  <span className={`text-xs font-bold ${
                                    attempt.totalScore >= 80 ? 'text-green-600' :
                                    attempt.totalScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {Number(attempt.totalScore).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              
                              <div>
                                <h5 className="text-sm font-medium leading-tight truncate">
                                  {attempt.quizName}
                                </h5>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {attemptDate.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 pt-1">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        attempt.totalScore >= 80 ? 'bg-green-500' :
                                        attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${attempt.totalScore}%` }}
                                    />
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-1.5 py-0.5 ${
                                    attempt.totalScore >= 80 ? 'text-green-600 border-green-300' :
                                    attempt.totalScore >= 60 ? 'text-yellow-600 border-yellow-300' : 
                                    'text-red-600 border-red-300'
                                  }`}
                                >
                                  {attempt.totalScore >= 80 ? 'Excellent' :
                                   attempt.totalScore >= 60 ? 'Good' : 'Needs Work'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                {attempts.length > 3 && (
                  <>
                    <CarouselPrevious className="hidden sm:flex -left-4 hover:bg-blue-50 hover:border-blue-300" />
                    <CarouselNext className="hidden sm:flex -right-4 hover:bg-blue-50 hover:border-blue-300" />
                  </>
                )}
              </Carousel>
              
              {/* Mobile navigation dots */}
              <div className="flex justify-center gap-1 mt-3 sm:hidden">
                {Array.from({ length: Math.ceil(Math.min(attempts.length, 10) / 2) }).map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
