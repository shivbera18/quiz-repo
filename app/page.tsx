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
    <div className="min-h-screen neu-surface flex items-center justify-center p-4">
      <div className="text-center">
        <div className="neu-card p-12 max-w-md mx-auto">
          <div className="neu-card-inset p-8 mb-8 rounded-2xl">
            <h1 className="text-3xl font-bold neu-text-gradient mb-2">Banking Exam Hub</h1>
            <p className="text-muted-foreground">Your comprehensive preparation platform</p>
          </div>
          <div className="neu-card-inset p-6 rounded-2xl">
            <p className="text-muted-foreground mb-4">Redirecting you to your personalized dashboard...</p>
            <div className="flex justify-center">
              <div className="neu-card-inset p-3 rounded-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
