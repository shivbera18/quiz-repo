"use client"
import { useAuth } from "@/hooks/use-auth"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  fallbackMessage?: string
}

// Loading skeleton that shows immediately
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  fallbackMessage = "Please log in to access this page",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth(requireAdmin)
  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading skeleton during SSR and initial hydration
  if (!mounted || loading) {
    return <LoadingSkeleton />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{fallbackMessage}</p>
          <Link href="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (requireAdmin && (!user.isAdmin || user.userType !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Admin access required</p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
