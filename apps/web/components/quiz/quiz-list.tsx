"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, ArrowRight, CalendarClock } from "lucide-react"

type SchedulingStatus = "available" | "upcoming" | "closed"

interface Quiz {
    id: string
    title: string
    description: string
    timeLimitSec: number
    sectionNames: string[]
    questionCount: number
    startTime?: string | null
    endTime?: string | null
    schedulingStatus?: SchedulingStatus
}

interface QuizListProps {
    quizzes: Quiz[]
    emptyMessage?: string
}

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

function computeStatus(q: Quiz): SchedulingStatus {
    if (q.schedulingStatus) return q.schedulingStatus
    const now = Date.now()
    if (q.endTime) {
        const end = Date.parse(q.endTime)
        if (!Number.isNaN(end) && now > end) return "closed"
    }
    if (q.startTime) {
        const start = Date.parse(q.startTime)
        if (!Number.isNaN(start) && now < start) return "upcoming"
    }
    return "available"
}

function formatScheduleLabel(q: Quiz, status: SchedulingStatus): string | null {
    if (status === "upcoming" && q.startTime) {
        try { return `Opens ${new Date(q.startTime).toLocaleString()}` } catch { return "Upcoming" }
    }
    if (status === "closed") return "Closed"
    return null
}

export function QuizList({ quizzes, emptyMessage = "No quizzes found." }: QuizListProps) {
    if (quizzes.length === 0) {
        return (
            <div className="text-center py-16">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
            {quizzes.map((quiz) => {
                const status = computeStatus(quiz)
                const scheduleLabel = formatScheduleLabel(quiz, status)
                const isLocked = status !== "available"
                return (
                <motion.div key={quiz.id} variants={staggerItem}>
                    <div className={isLocked ? "block group opacity-95" : "block group"}>
                        <Card variant="neobrutalist" className="h-full flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="capitalize text-xs font-bold bg-yellow-300 text-black border-2 border-black hover:bg-yellow-400">
                                            General
                                        </Badge>
                                        {quiz.sectionNames.length > 1 && (
                                            <Badge className="text-xs font-bold bg-blue-300 text-black border-2 border-black hover:bg-blue-400">Full Mock</Badge>
                                        )}
                                    </div>
                                    {status !== "available" && (
                                        <Badge className={`text-xs font-bold border-2 border-black ${status === "upcoming" ? "bg-blue-300 text-black" : "bg-red-300 text-black"}`}>
                                            {status === "upcoming" ? "Upcoming" : "Closed"}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 text-lg font-black group-hover:text-primary transition-colors leading-tight">
                                    {quiz.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-sm mt-1.5 font-medium">
                                    {quiz.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-grow pb-3">
                                <div className="flex items-center gap-4 text-sm mb-4">
                                    <div className="flex items-center gap-1.5 bg-green-200 dark:bg-green-400/30 px-2 py-1 rounded-lg border-2 border-black dark:border-white/65">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="text-xs font-bold">{Math.ceil(quiz.timeLimitSec / 60)}m</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-purple-200 dark:bg-purple-400/30 px-2 py-1 rounded-lg border-2 border-black dark:border-white/65">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span className="text-xs font-bold">{quiz.questionCount} Qs</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {quiz.sectionNames.slice(0, 3).map((section) => (
                                        <Badge key={section} variant="outline" className="text-xs font-bold px-2 py-0.5 border-2 border-black dark:border-white/65 bg-white dark:bg-zinc-800">
                                            {section}
                                        </Badge>
                                    ))}
                                    {quiz.sectionNames.length > 3 && (
                                        <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-2 border-black dark:border-white/65 bg-white dark:bg-zinc-800">
                                            +{quiz.sectionNames.length - 3}
                                        </Badge>
                                    )}
                                </div>
                                {scheduleLabel && (
                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>{scheduleLabel}</span>
                                        {quiz.endTime && status === "available" && (() => { try { return <span>· Closes {new Date(quiz.endTime!).toLocaleString()}</span> } catch { return null } })()}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="pt-3 border-t-4 border-black dark:border-white/65 bg-orange-100 dark:bg-orange-400/20 rounded-b-xl">
                                {isLocked ? (
                                    <Button variant="neobrutalistInverted" className="w-full text-sm font-bold opacity-60 cursor-not-allowed" disabled>
                                        {status === "upcoming" ? "Not yet open" : "Closed"}
                                    </Button>
                                ) : (
                                    <Link href={`/quiz/${quiz.id}`} className="w-full">
                                        <Button variant="neobrutalistInverted" className="w-full text-sm font-bold">
                                            Start Quiz
                                            <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </motion.div>
                )})}
        </motion.div>
    )
}
