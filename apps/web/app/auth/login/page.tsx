"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Lock, Mail, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [studentData, setStudentData] = useState({ email: "", password: "" })
  const [adminData, setAdminData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("student")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Demo credentials for quick login
  const demoCredentials = {
    student: { email: "student@example.com", password: "password" },
    admin: { email: "admin@quizapp.com", password: "admin123" }
  }

  const fillDemoCredentials = (type: "student" | "admin") => {
    if (type === "student") {
      setStudentData(demoCredentials.student)
    } else {
      setAdminData(demoCredentials.admin)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Render static version during SSR to prevent hydration mismatch
  const content = (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Quizzy</h1>
        <p className="mt-2 text-muted-foreground">Master your banking exams</p>
      </div>

      <Card variant="neobrutalist" className="border-4 border-black shadow-[8px_8px_0px_0px_#000] dark:border-white/65 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)]">
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
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={studentData.email}
                    onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                    neobrutalist
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={studentData.password}
                    onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                    neobrutalist
                  />
                </div>
                <Button
                  type="button"
                  variant="neobrutalist"
                  className="w-full border-4 border-black bg-emerald-400 text-black font-bold shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all dark:bg-emerald-500 dark:text-black dark:border-white/65 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.65)]"
                  onClick={() => fillDemoCredentials("student")}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Fill Demo Credentials
                </Button>
                <Button type="submit" className="w-full" disabled={loading} variant="neobrutalist">
                  {loading ? "Logging in..." : "Login as Student"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    neobrutalist
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    neobrutalist
                  />
                </div>
                <Button
                  type="button"
                  variant="neobrutalist"
                  className="w-full border-4 border-black bg-cyan-400 text-black font-bold shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all dark:bg-cyan-500 dark:text-black dark:border-white/65 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.65)]"
                  onClick={() => fillDemoCredentials("admin")}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Fill Demo Credentials
                </Button>
                <Button type="submit" className="w-full" disabled={loading} variant="neobrutalist">
                  {loading ? "Logging in..." : "Login as Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="underline font-bold">
              Sign up
            </Link>
          </div>
          {activeTab === "student" && (
            <div className="text-center text-xs text-muted-foreground">
              Demo: student@example.com / password
            </div>
          )}
          {activeTab === "admin" && (
            <div className="text-center text-xs text-muted-foreground">
              Demo: admin@quizapp.com / admin123
            </div>
          )}
        </CardFooter>
      </Card>
    </div >
  )

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {mounted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {content}
        </motion.div>
      ) : (
        content
      )}
    </div>
  )
}
