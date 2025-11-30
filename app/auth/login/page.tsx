"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Lock, Mail } from "lucide-react"
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
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Quizzy</h1>
          <p className="mt-2 text-muted-foreground">Master your banking exams</p>
        </div>

        <Card className="border-border/50 shadow-medium">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Both options always visible on login for clarity */}
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Student</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="student">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="student-email"
                        type="email"
                        placeholder="student@example.com"
                        className="pl-10"
                        value={studentData.email}
                        onChange={(e) => setStudentData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="student-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={studentData.password}
                        onChange={(e) => setStudentData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@bank.com"
                        className="pl-10"
                        value={adminData.email}
                        onChange={(e) => setAdminData((prev) => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={adminData.password}
                        onChange={(e) => setAdminData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t bg-muted/20 p-6">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
            {activeTab === "student" && (
              <div className="text-center text-xs text-muted-foreground">
                Demo: student@example.com / password
              </div>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
