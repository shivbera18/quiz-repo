"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface QuizFiltersProps {
    onFilterChange: (filters: any) => void
    activeFilters: any
}

export function QuizFilters({ onFilterChange, activeFilters }: QuizFiltersProps) {
    const [localFilters, setLocalFilters] = React.useState(activeFilters)
    const [isOpen, setIsOpen] = React.useState(false)

    const handleApply = () => {
        onFilterChange(localFilters)
        setIsOpen(false)
    }

    const handleReset = () => {
        const reset = { difficulty: "all", duration: [0, 120] }
        setLocalFilters(reset)
        onFilterChange(reset)
        setIsOpen(false)
    }

    const activeCount = (activeFilters.difficulty !== "all" ? 1 : 0) + (activeFilters.duration[1] < 120 ? 1 : 0)

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {activeCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Filter Quizzes</SheetTitle>
                    <SheetDescription>
                        Narrow down quizzes by difficulty, duration, and more.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                    <div className="space-y-4">
                        <Label>Difficulty</Label>
                        <RadioGroup
                            value={localFilters.difficulty}
                            onValueChange={(val) => setLocalFilters({ ...localFilters, difficulty: val })}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all">All Levels</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="beginner" id="beginner" />
                                <Label htmlFor="beginner">Beginner</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="intermediate" id="intermediate" />
                                <Label htmlFor="intermediate">Intermediate</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="advanced" id="advanced" />
                                <Label htmlFor="advanced">Advanced</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <Label>Max Duration (minutes)</Label>
                            <span className="text-sm text-muted-foreground">{localFilters.duration[1]}m</span>
                        </div>
                        <Slider
                            defaultValue={[120]}
                            value={[localFilters.duration[1]]}
                            max={120}
                            step={10}
                            onValueChange={(val) => setLocalFilters({ ...localFilters, duration: [0, val[0]] })}
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-auto">
                    <Button variant="outline" className="w-full" onClick={handleReset}>Reset</Button>
                    <Button className="w-full" onClick={handleApply}>Apply Filters</Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
