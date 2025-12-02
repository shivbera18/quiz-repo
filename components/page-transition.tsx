"use client"

import { usePathname } from "next/navigation"
import { ReactNode, useState, useEffect } from "react"

interface PageTransitionProps {
  children: ReactNode
}

// Simplified page transition that doesn't cause hydration/navigation issues
// The AnimatePresence with mode="wait" was causing white screens on back navigation
// because the exit animation would complete but the enter animation wouldn't trigger
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial hydration, render children directly
  // This ensures server HTML matches initial client HTML
  if (!mounted) {
    return <>{children}</>
  }

  // Simple wrapper - let Next.js handle navigation
  // This avoids the white screen issue on back navigation
  return (
    <div key={pathname} className="min-h-screen">
      {children}
    </div>
  )
}

// Route-specific transition variants for different page types
export const routeTransitions = {
  dashboard: {
    initial: { opacity: 0, y: 30 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -30 }
  },
  quiz: {
    initial: { opacity: 0, x: 100 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -100 }
  },
  results: {
    initial: { opacity: 0, scale: 0.9 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.1 }
  }
}

// Stagger animation for lists and cards
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12
    }
  }
}
