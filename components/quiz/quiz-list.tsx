"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, ArrowRight } from "lucide-react"

interface Quiz {
    id: string
    title: string
    description: string
    duration: number
    sections: string[]
    questions: any[]
    difficulty?: string
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
            {quizzes.map((quiz) => (
                <motion.div key={quiz.id} variants={staggerItem}>
                    <Link href={`/quiz/${quiz.id}`} className="block group">
                        <Card variant="neobrutalist" className="h-full flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge className="capitalize text-xs font-bold bg-yellow-300 text-black border-2 border-black hover:bg-yellow-400">
                                        {quiz.difficulty || "General"}
                                    </Badge>
                                    {quiz.sections.length > 1 && (
                                        <Badge className="text-xs font-bold bg-blue-300 text-black border-2 border-black hover:bg-blue-400">Full Mock</Badge>
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
                                        <span className="text-xs font-bold">{quiz.duration}m</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-purple-200 dark:bg-purple-400/30 px-2 py-1 rounded-lg border-2 border-black dark:border-white/65">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span className="text-xs font-bold">{quiz.questions.length} Qs</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {quiz.sections.slice(0, 3).map((section) => (
                                        <Badge key={section} variant="outline" className="text-xs font-bold px-2 py-0.5 border-2 border-black dark:border-white/65 bg-white dark:bg-zinc-800">
                                            {section}
                                        </Badge>
                                    ))}
                                    {quiz.sections.length > 3 && (
                                        <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-2 border-black dark:border-white/65 bg-white dark:bg-zinc-800">
                                            +{quiz.sections.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="pt-3 border-t-4 border-black dark:border-white/65 bg-orange-100 dark:bg-orange-400/20 rounded-b-xl">
                                <Button variant="neobrutalistInverted" className="w-full text-sm font-bold">
                                    Start Quiz
                                    <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    )
}
