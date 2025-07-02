"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [studentData, setStudentData] = useState({ email: "", password: "" })
  const [adminData, setAdminData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("student")
  const router = useRouter()

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentData.email,
          password: studentData.password,
          userType: "student",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/dashboard")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
          userType: "admin",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/admin")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen neu-surface flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6">
        <div className="neu-icon-button">
          <ThemeToggle />
        </div>
      </div>
      
      <div className="neu-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="neu-card-inset p-6 rounded-2xl mb-6">
            <h1 className="text-3xl font-bold neu-text-gradient mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your account</p>
          </div>
        </div>
        <div className="neu-card-inset p-6 rounded-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="neu-card p-2 rounded-2xl">
              <TabsList className="grid w-full grid-cols-2 bg-transparent border-0 p-1 gap-1">
                <TabsTrigger 
                  value="student" 
                  className="neu-button flex items-center gap-2 data-[state=active]:neu-card-inset data-[state=active]:bg-background"
                >
                  <User className="h-4 w-4" />
                  Student
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="neu-button flex items-center gap-2 data-[state=active]:neu-card-inset data-[state=active]:bg-background"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>
            </div>

            {error && (
              <div className="neu-card-inset p-4 rounded-2xl border-destructive/20">
                <Alert variant="destructive" className="border-0 bg-transparent">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Student Login */}
            <TabsContent value="student" className="space-y-6">
              <form onSubmit={handleStudentLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="student-email" className="text-sm font-medium text-foreground">Email</Label>
                  <input
                    id="student-email"
                    type="email"
                    placeholder="student@example.com"
                    value={studentData.email}
                    onChange={(e) => setStudentData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="neu-input w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="student-password" className="text-sm font-medium text-foreground">Password</Label>
                  <input
                    id="student-password"
                    type="password"
                    placeholder="Enter your password"
                    value={studentData.password}
                    onChange={(e) => setStudentData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="neu-input w-full"
                  />
                </div>

                <button type="submit" className="neu-button w-full py-4 font-medium text-primary" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Student"}
                </button>

                <div className="neu-card-inset p-4 rounded-2xl text-center">
                  <p className="text-xs text-muted-foreground mb-1">Demo Student Account:</p>
                  <p className="text-xs text-muted-foreground">Email: student@example.com | Password: password</p>
                </div>
              </form>
            </TabsContent>

            {/* Admin Login */}
            <TabsContent value="admin" className="space-y-6">
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="admin-email" className="text-sm font-medium text-foreground">Admin Email</Label>
                  <input
                    id="admin-email"
                    type="email"
                    placeholder="admin@bank.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="neu-input w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="admin-password" className="text-sm font-medium text-foreground">Admin Password</Label>
                  <input
                    id="admin-password"
                    type="password"
                    placeholder="Enter admin password"
                    value={adminData.password}
                    onChange={(e) => setAdminData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="neu-input w-full"
                  />
                </div>

                <button type="submit" className="neu-button w-full py-4 font-medium text-primary" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Admin"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-8 text-center">
          <div className="neu-card-inset p-4 rounded-2xl">
            <p className="text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/auth/signup" className="text-primary hover:text-accent font-medium">
                Sign up as Student
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
