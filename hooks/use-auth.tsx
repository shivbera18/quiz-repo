"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  userType: "admin" | "student"
}

export function useAuth(requireAdmin = false) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      setLoading(false)
      if (requireAdmin) {
        router.push("/auth/login")
      }
      return
    }

    try {
      const parsedUser = JSON.parse(userData)

      // Simple token validation (check if it looks like our format)
      if (!token.includes("-") || token.length < 10) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setLoading(false)
        if (requireAdmin) {
          router.push("/auth/login")
        }
        return
      }

      if (requireAdmin && (!parsedUser.isAdmin || parsedUser.userType !== "admin")) {
        router.push("/dashboard")
        return
      }

      setUser(parsedUser)
    } catch (error) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (requireAdmin) {
        router.push("/auth/login")
      }
    } finally {
      setLoading(false)
    }
  }, [requireAdmin, router])

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/auth/login")
  }

  return { user, loading, logout }
}
