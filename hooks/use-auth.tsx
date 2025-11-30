"use client"
import { useEffect, useState, useCallback, useSyncExternalStore, useRef } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: "admin" | "student"
  token?: string
}

// Cache for the user object to prevent infinite loops
let cachedUser: User | null = null
let cachedToken: string | null = null
let cachedUserData: string | null = null

// Storage subscription for useSyncExternalStore
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  // Also listen for custom auth events
  window.addEventListener("auth-change", callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("auth-change", callback)
  }
}

// Get snapshot of user from localStorage - must return stable reference
function getSnapshot(): User | null {
  try {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    
    // Return cached value if nothing changed
    if (token === cachedToken && userData === cachedUserData) {
      return cachedUser
    }
    
    // Update cache keys
    cachedToken = token
    cachedUserData = userData
    
    if (!token || !userData) {
      cachedUser = null
      return null
    }
    
    // Simple token validation
    if (!token.includes("-") || token.length < 10) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      cachedUser = null
      return null
    }
    
    const parsedUser = JSON.parse(userData)
    parsedUser.token = token
    cachedUser = parsedUser
    return cachedUser
  } catch {
    cachedUser = null
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
    // Reset cache
    cachedUser = null
    cachedToken = null
    cachedUserData = null
    // Trigger storage event for other tabs and this tab
    window.dispatchEvent(new StorageEvent("storage", { key: "token" }))
    window.dispatchEvent(new Event("auth-change"))
    router.push("/auth/login")
  }, [router])

  // Loading is true only during server-side render
  const loading = !isHydrated

  return { user, loading, logout }
}
