"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Users, Search, Mail, Calendar, TrendingUp, Download, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"

interface User {
  id: string
  name: string
  email: string
  userType: "admin" | "student"
  isAdmin: boolean
  joinDate: string
  lastActive?: string
  totalAttempts: number
  averageScore: number
  bestScore: number
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [userTypeFilter, setUserTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchUsers = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError("")

      const token = localStorage.getItem("token")
      if (!token) {
        setError("No authentication token found")
        return
      }

      console.log("Fetching users with token:", token.substring(0, 20) + "...")

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received users data:", data)

      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      fetchUsers()
    }
  }, [loading, user])

  useEffect(() => {
    let filtered = [...users]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // User type filter
    if (userTypeFilter !== "all") {
      filtered = filtered.filter((u) => u.userType === userTypeFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "email":
          return a.email.localeCompare(b.email)
        case "joinDate":
          return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
        case "lastActive":
          return new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime()
        case "totalAttempts":
          return b.totalAttempts - a.totalAttempts
        case "averageScore":
          return b.averageScore - a.averageScore
        default:
          return 0
      }
    })

    setFilteredUsers(filtered)
  }, [users, searchTerm, userTypeFilter, sortBy])

  const getOverallStats = () => {
    const totalUsers = users.length
    const activeUsers = users.filter((u) => u.totalAttempts > 0).length
    const adminUsers = users.filter((u) => u.isAdmin).length
    const studentUsers = users.filter((u) => !u.isAdmin).length
    const avgAttemptsPerUser =
      totalUsers > 0 ? Math.round(users.reduce((sum, u) => sum + u.totalAttempts, 0) / totalUsers) : 0
    const avgScoreAllUsers =
      users.filter((u) => u.totalAttempts > 0).length > 0
        ? Math.round(
            users.filter((u) => u.totalAttempts > 0).reduce((sum, u) => sum + u.averageScore, 0) /
              users.filter((u) => u.totalAttempts > 0).length,
          )
        : 0

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      studentUsers,
      avgAttemptsPerUser,
      avgScoreAllUsers,
    }
  }

  const exportUserData = () => {
    const exportData = {
      generatedAt: new Date().toISOString(),
      totalUsers: filteredUsers.length,
      users: filteredUsers.map((u) => ({
        name: u.name,
        email: u.email,
        userType: u.userType,
        joinDate: u.joinDate,
        lastActive: u.lastActive,
        totalAttempts: u.totalAttempts,
        averageScore: u.averageScore,
        bestScore: u.bestScore,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stats = getOverallStats()

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div>Loading users...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <Button onClick={fetchUsers}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-0">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground">Manage and monitor user accounts and performance</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <ThemeToggle />
            <Button onClick={exportUserData}>
              <Download className="h-4 w-4 mr-2" />
              Export Users
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Have taken quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.studentUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Attempts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgAttemptsPerUser}</div>
              <p className="text-xs text-muted-foreground">per user</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScoreAllUsers}%</div>
              <p className="text-xs text-muted-foreground">all active users</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Users</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>User Type</Label>
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="joinDate">Join Date</SelectItem>
                    <SelectItem value="lastActive">Last Active</SelectItem>
                    <SelectItem value="totalAttempts">Total Attempts</SelectItem>
                    <SelectItem value="averageScore">Average Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Results</Label>
                <div className="text-sm text-muted-foreground pt-2">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
            <CardDescription>Complete list of registered users and their performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Join Date</th>
                    <th className="text-left p-3">Last Active</th>
                    <th className="text-left p-3">Attempts</th>
                    <th className="text-left p-3">Avg Score</th>
                    <th className="text-left p-3">Best Score</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>{user.userType}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.joinDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "Never"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">{user.totalAttempts}</div>
                      </td>
                      <td className="p-3">
                        {user.totalAttempts > 0 ? (
                          <Badge variant={user.averageScore >= 70 ? "default" : "destructive"}>
                            {user.averageScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {user.totalAttempts > 0 ? (
                          <div className="text-sm font-medium">{user.bestScore}%</div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{user.totalAttempts > 0 ? "Active" : "Inactive"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
