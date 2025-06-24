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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Banking Exam Preparation</h1>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  )
}
