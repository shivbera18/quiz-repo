"use client"
import { useEffect, useState, useCallback, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: "admin" | "student"
  token?: string
}

// Storage subscription for useSyncExternalStore
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

// Get snapshot of user from localStorage
function getSnapshot(): User | null {
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

// Server snapshot (always null)
function getServerSnapshot(): User | null {
  return null
}

export function useAuth(requireAdmin = false) {
  const router = useRouter()
  
  // Use useSyncExternalStore for reliable cross-navigation state
  const user = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  
  // Track if we've done initial hydration
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Handle redirects
  useEffect(() => {
    if (!isHydrated) return
    
    if (!user && requireAdmin) {
      router.push("/auth/login")
      return
    }

    if (user && requireAdmin && (!user.isAdmin || user.userType !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, requireAdmin, router, isHydrated])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent("storage", { key: "token" }))
    router.push("/auth/login")
  }, [router])

  // Loading is true only during server-side render
  const loading = !isHydrated

  return { user, loading, logout }
}
