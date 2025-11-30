"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (token && user) {
      try {
        const userData = JSON.parse(user)
        // Redirect based on user type
        if (userData.isAdmin) {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      } catch (error) {
        // Invalid user data, redirect to login
        router.push("/auth/login")
      }
    } else {
      // No token, redirect to login
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Quizzy</h1>
        <p className="text-muted-foreground">Redirecting...</p>
        <div className="flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    </div>
  )
}
