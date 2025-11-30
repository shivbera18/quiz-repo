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
                        <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-muted">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                                        {quiz.difficulty || "General"}
                                    </Badge>
                                    {quiz.sections.length > 1 && (
                                        <Badge className="text-xs">Full Mock</Badge>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors leading-tight">
                                    {quiz.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 text-sm mt-1.5">
                                    {quiz.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-grow pb-3">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="text-xs font-medium">{quiz.duration}m</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span className="text-xs font-medium">{quiz.questions.length} Qs</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {quiz.sections.slice(0, 3).map((section) => (
                                        <Badge key={section} variant="outline" className="text-xs font-normal px-2 py-0.5">
                                            {section}
                                        </Badge>
                                    ))}
                                    {quiz.sections.length > 3 && (
                                        <Badge variant="outline" className="text-xs font-normal px-2 py-0.5">
                                            +{quiz.sections.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="pt-3 border-t bg-muted/30">
                                <Button className="w-full group-hover:bg-primary/90 transition-colors text-sm h-9">
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
