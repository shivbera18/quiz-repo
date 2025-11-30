"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Calculator, Plus, Minus, X, Divide, Shuffle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { FlashQuestions } from "@/components/flash-questions"

export default function FlashCardsPage() {
  const { user, loading } = useAuth()
  const [isFlashModalOpen, setIsFlashModalOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<string>("")

  const flashCardTypes = [
    {
      id: "addition",
      title: "Addition Practice",
      description: "Practice addition with mixed difficulty levels",
      icon: Plus,
      color: "bg-green-500",
      operation: "Addition"
    },
    {
      id: "subtraction", 
      title: "Subtraction Practice",
      description: "Practice subtraction with mixed difficulty levels",
      icon: Minus,
      color: "bg-blue-500",
      operation: "Subtraction"
    },
    {
      id: "multiplication",
      title: "Multiplication Practice", 
      description: "Practice multiplication with mixed difficulty levels",
      icon: X,
      color: "bg-purple-500",
      operation: "Multiplication"
    },
    {
      id: "division",
      title: "Division Practice",
      description: "Practice division with mixed difficulty levels",
      icon: Divide,
      color: "bg-orange-500", 
      operation: "Division"
    },
    {
      id: "mixed",
      title: "Mixed Practice",
      description: "Practice all operations with random questions",
      icon: Shuffle,
      color: "bg-red-500",
      operation: "Mixed"
    }
  ]

  const handleStartFlashCards = (operation: string) => {
    setSelectedOperation(operation)
    setIsFlashModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center">Loading flash cards...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-0">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Flash Math Cards</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Quick math practice for faster calculations</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Difficulty Level Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Choose Your Difficulty Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* 2-Digit Card */}
            <Link href="/dashboard/flash-cards/2-digit">
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-blue-500">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Calculator className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">2-Digit Numbers</CardTitle>
                  <CardDescription>Quick and fast calculations (10-99)</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary">Fast Calc</Badge>
                    <Badge variant="outline">Beginner-Friendly</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Perfect for building speed and confidence with mental math
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* 3-Digit Card */}
            <Link href="/dashboard/flash-cards/3-digit">
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-purple-500">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Calculator className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">3-Digit Numbers</CardTitle>
                  <CardDescription>Advanced calculations (100-999)</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary">Advanced</Badge>
                    <Badge variant="outline">Challenging</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enhance your skills with more complex mental calculations
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or practice with mixed difficulty</span>
            </div>
          </div>
        </div>

        {/* Flash Card Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {flashCardTypes.map((type) => {
            const IconComponent = type.icon
            return (
              <Card key={type.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${type.color} p-2 rounded-lg text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {type.description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Calculator className="h-3 w-3 mr-1" />
                        Quick Math
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Mixed Difficulty
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleStartFlashCards(type.operation)}
                  >
                    Start Practice
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5" />
              Flash Card Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Quick Practice</h4>
                <p className="text-muted-foreground">Fast-paced questions for improving calculation speed</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Mixed Difficulty Levels</h4>
                <p className="text-muted-foreground">Choose from 2-digit or 3-digit specific challenges</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Separate Practice</h4>
                <p className="text-muted-foreground">Focus on specific operations or try mixed questions</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Instant Feedback</h4>
                <p className="text-muted-foreground">Get immediate results to track your progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flash Questions Modal */}
      {isFlashModalOpen && (
        <FlashQuestions
          isOpen={isFlashModalOpen}
          onClose={() => setIsFlashModalOpen(false)}
          questions={[]} // Will be generated based on operation type
          operationType={selectedOperation}
          maxDigits={3}
        />
      )}
    </div>
  )
}
