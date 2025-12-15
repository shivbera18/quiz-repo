"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface QuizzyLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

// SVG Logo component using the new design from /public/svg.svg
// Light mode: black on white (as-is)
// Dark mode: white on black (inverted)
function QuizzyLogoSVG({ className }: { className?: string }) {
  return (
    <>
      {/* Light mode logo */}
      <Image
        src="/svg.svg"
        alt="Quizzy Logo"
        width={100}
        height={100}
        className={cn(className, "dark:hidden")}
      />
      {/* Dark mode logo - using CSS filter to invert */}
      <Image
        src="/svg.svg"
        alt="Quizzy Logo"
        width={100}
        height={100}
        className={cn(className, "hidden dark:block dark:invert")}
      />
    </>
  )
}

export function QuizzyLogo({ size = "md", showText = true, className }: QuizzyLogoProps) {
  const sizes = {
    sm: {
      container: "h-9 w-9",
      text: "text-lg",
    },
    md: {
      container: "h-11 w-11",
      text: "text-2xl",
    },
    lg: {
      container: "h-14 w-14",
      text: "text-3xl",
    },
  }

  const s = sizes[size]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Q Logo - Notion style (flipped) */}
      <div className={cn(s.container, "relative")}>
        <QuizzyLogoSVG className="h-full w-full" />
      </div>
      
      {/* Text */}
      {showText && (
        <span className={cn(s.text, "font-black tracking-tight text-black dark:text-white")}>
          Quizzy
        </span>
      )}
    </div>
  )
}
