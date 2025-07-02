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
import { User } from "lucide-react"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType: "student",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/dashboard")
      } else {
        setError(data.message || "Signup failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen neu-surface flex items-center justify-center p-4">
      <div className="neu-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="neu-card-inset p-6 rounded-2xl mb-6">
            <h1 className="text-3xl font-bold neu-text-gradient mb-2 flex items-center justify-center gap-3">
              <div className="neu-icon-button p-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              Join Our Community
            </h1>
            <p className="text-muted-foreground">Create your student account and start your banking exam journey</p>
          </div>
        </div>
        <div className="neu-card-inset p-6 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="neu-card-inset p-4 rounded-2xl border-destructive/20">
                <Alert variant="destructive" className="border-0 bg-transparent">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                className="neu-input w-full"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="neu-input w-full"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
                className="neu-input w-full"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="neu-input w-full"
              />
            </div>

            <button type="submit" className="neu-button w-full py-4 font-medium text-primary" disabled={loading}>
              {loading ? "Creating account..." : "Create Student Account"}
            </button>
          </form>
        </div>

        <div className="mt-8 space-y-4">
          <div className="neu-card-inset p-4 rounded-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:text-accent font-medium">
                Sign in
              </Link>
            </p>
          </div>
          <div className="neu-card-inset p-3 rounded-2xl text-center">
            <p className="text-xs text-muted-foreground">Admin accounts are created by system administrators only</p>
          </div>
        </div>
      </div>
    </div>
  )
}
