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

export default function FlashCards2DigitPage() {
  const { user, loading } = useAuth()
  const [isFlashModalOpen, setIsFlashModalOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<string>("")

  const flashCardTypes = [
    {
      id: "addition",
      title: "Addition Practice",
      description: "Practice addition with 2-digit numbers (faster calculations)",
      icon: Plus,
      color: "bg-green-500",
      operation: "Addition"
    },
    {
      id: "subtraction", 
      title: "Subtraction Practice",
      description: "Practice subtraction with 2-digit numbers (faster calculations)",
      icon: Minus,
      color: "bg-blue-500",
      operation: "Subtraction"
    },
    {
      id: "multiplication",
      title: "Multiplication Practice", 
      description: "Practice multiplication with 2-digit numbers (faster calculations)",
      icon: X,
      color: "bg-purple-500",
      operation: "Multiplication"
    },
    {
      id: "division",
      title: "Division Practice",
      description: "Practice division with 2-digit numbers (faster calculations)",
      icon: Divide,
      color: "bg-orange-500", 
      operation: "Division"
    },
    {
      id: "mixed",
      title: "Mixed Practice",
      description: "Practice all operations with random 2-digit questions",
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
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
        <div className="text-center">Loading flash cards...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background mobile-header-safe-zone">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/flash-cards">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">2-Digit Flash Math Cards</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Quick math practice with 2-digit numbers for faster calculations</p>
            </div>
          </div>
          <ThemeToggle />
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
                        2-Digit Math
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Fast Calc
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
              2-Digit Flash Card Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Quick Practice</h4>
                <p className="text-muted-foreground">Fast-paced questions for improving calculation speed</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2-Digit Numbers</h4>
                <p className="text-muted-foreground">Optimized for mental math and quick solving (10-99)</p>
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

        {/* Navigation to other difficulty levels */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Other Difficulty Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard/flash-cards/3-digit" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Try 3-Digit Numbers
                  </Button>
                </Link>
                <Link href="/dashboard/flash-cards" className="flex-1">
                  <Button variant="outline" className="w-full">
                    All Flash Cards
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Flash Questions Modal */}
      {isFlashModalOpen && (
        <FlashQuestions
          isOpen={isFlashModalOpen}
          onClose={() => setIsFlashModalOpen(false)}
          questions={[]} // Will be generated based on operation type
          operationType={selectedOperation}
          maxDigits={2}
        />
      )}
    </div>
  )
}
