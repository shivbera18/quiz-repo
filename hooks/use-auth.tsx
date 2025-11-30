"use client"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: "admin" | "student"
  token?: string // Add token property for API auth
}

// Helper to get initial user from localStorage (runs synchronously)
function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    
    if (!token || !userData) return null
    
    // Simple token validation
    if (!token.includes("-") || token.length < 10) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      return null
    }
    
    const parsedUser = JSON.parse(userData)
    parsedUser.token = token
    return parsedUser
  } catch {
    return null
  }
}

export function useAuth(requireAdmin = false) {
  // Initialize with localStorage data immediately (no loading flash)
  const [user, setUser] = useState<User | null>(() => getInitialUser())
  const [loading, setLoading] = useState(() => typeof window === 'undefined')
  const router = useRouter()

  useEffect(() => {
    // Re-check on mount in case localStorage changed
    const currentUser = getInitialUser()
    
    if (!currentUser) {
      setUser(null)
      setLoading(false)
      if (requireAdmin) {
        router.push("/auth/login")
      }
      return
    }

    // Admin check
    if (requireAdmin && (!currentUser.isAdmin || currentUser.userType !== "admin")) {
      router.push("/dashboard")
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [requireAdmin, router])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/auth/login")
  }

  return { user, loading, logout }
}
