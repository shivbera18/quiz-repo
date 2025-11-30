"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  AlertTriangle,
  Users,
  Calendar as CalendarIcon,
  Clock,
  X,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { format, setHours, setMinutes } from "date-fns"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  title: string
  content: string
  priority: "low" | "normal" | "high" | "urgent"
  isActive: boolean
  createdAt: string
  expiresAt: string | null
  createdBy: string
  readCount: number
  totalUsers: number
  readPercentage: number
}

const priorityOptions = [
  { value: "low", label: "Low", icon: Info, color: "text-blue-500", bg: "bg-blue-500" },
  { value: "normal", label: "Normal", icon: Megaphone, color: "text-primary", bg: "bg-primary" },
  { value: "high", label: "High", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500" },
  { value: "urgent", label: "Urgent", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500" },
]

export default function AdminAnnouncementsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    expiresAt: ""
  })
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined)
  const [expiresTime, setExpiresTime] = useState({ hours: "12", minutes: "00" })
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }
    if (!authLoading && user && !user.isAdmin) {
      router.push("/dashboard")
      return
    }
    if (user?.isAdmin) {
      fetchAnnouncements()
    }
  }, [user, authLoading, router])

  const fetchAnnouncements = async () => {
    if (!user?.token) return

    try {
      setLoading(true)
      const response = await fetch("/api/admin/announcements", {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user?.token || !formData.title || !formData.content) return

    try {
      setSubmitting(true)
      
      const url = editingAnnouncement 
        ? `/api/announcements/${editingAnnouncement.id}`
        : "/api/announcements"
      
      const method = editingAnnouncement ? "PUT" : "POST"

      // Combine date and time for expiry
      let expiresAtValue = null
      if (expiresDate) {
        const combined = setMinutes(
          setHours(expiresDate, parseInt(expiresTime.hours)),
          parseInt(expiresTime.minutes)
        )
        expiresAtValue = combined.toISOString()
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
          expiresAt: expiresAtValue
        })
      })

      if (response.ok) {
        setIsDialogOpen(false)
        setEditingAnnouncement(null)
        setFormData({ title: "", content: "", priority: "normal", expiresAt: "" })
        setExpiresDate(undefined)
        setExpiresTime({ hours: "12", minutes: "00" })
        fetchAnnouncements()
      }
    } catch (error) {
      console.error("Failed to save announcement:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user?.token) return

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      if (response.ok) {
        fetchAnnouncements()
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error)
    }
  }

  const toggleActive = async (announcement: Announcement) => {
    if (!user?.token) return

    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          isActive: !announcement.isActive
        })
      })

      if (response.ok) {
        fetchAnnouncements()
      }
    } catch (error) {
      console.error("Failed to toggle announcement:", error)
    }
  }

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      expiresAt: announcement.expiresAt ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm") : ""
    })
    // Parse existing expiry date/time
    if (announcement.expiresAt) {
      const date = new Date(announcement.expiresAt)
      setExpiresDate(date)
      setExpiresTime({
        hours: date.getHours().toString().padStart(2, '0'),
        minutes: date.getMinutes().toString().padStart(2, '0')
      })
    } else {
      setExpiresDate(undefined)
      setExpiresTime({ hours: "12", minutes: "00" })
    }
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingAnnouncement(null)
    setFormData({ title: "", content: "", priority: "normal", expiresAt: "" })
    setExpiresDate(undefined)
    setExpiresTime({ hours: "12", minutes: "00" })
    setIsDialogOpen(true)
  }

  const clearExpiryDate = () => {
    setExpiresDate(undefined)
    setExpiresTime({ hours: "12", minutes: "00" })
  }

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45']

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const getPriorityConfig = (priority: string) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[1]
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" />
              Announcements
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage announcements for all users
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingAnnouncement 
                    ? "Update the announcement details below."
                    : "Create a new announcement to notify all users."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 sm:py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Announcement title..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your announcement..."
                    rows={4}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                
                {/* Priority Selection */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Modern Date & Time Picker */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Expiry Date & Time (Optional)</Label>
                    {expiresDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearExpiryDate}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Date Picker */}
                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:flex-1 justify-start text-left font-normal text-sm",
                            !expiresDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          <span className="truncate">{expiresDate ? format(expiresDate, "PPP") : "Pick a date"}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center" side="bottom">
                        <Calendar
                          mode="single"
                          selected={expiresDate}
                          onSelect={(date) => {
                            setExpiresDate(date)
                            setIsDatePopoverOpen(false)
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Time Picker */}
                    <div className="flex gap-1 justify-center sm:justify-start">
                      <Select
                        value={expiresTime.hours}
                        onValueChange={(value) => setExpiresTime({ ...expiresTime, hours: value })}
                        disabled={!expiresDate}
                      >
                        <SelectTrigger className="w-[65px] sm:w-[70px]">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-[200px]">
                            {hourOptions.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <span className="flex items-center text-muted-foreground">:</span>
                      <Select
                        value={expiresTime.minutes}
                        onValueChange={(value) => setExpiresTime({ ...expiresTime, minutes: value })}
                        disabled={!expiresDate}
                      >
                        <SelectTrigger className="w-[65px] sm:w-[70px]">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {minuteOptions.map((minute) => (
                            <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {expiresDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {format(expiresDate, "MMMM d, yyyy")} at {expiresTime.hours}:{expiresTime.minutes}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || !formData.title || !formData.content} className="w-full sm:w-auto">
                  {submitting ? "Saving..." : (editingAnnouncement ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{announcements.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Eye className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{announcements.filter(a => a.isActive).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{announcements.filter(a => a.priority === "high" || a.priority === "urgent").length}</p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {announcements.length > 0 ? Math.round(announcements.reduce((acc, a) => acc + a.readPercentage, 0) / announcements.length) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Read Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements List */}
        <Card>
          <CardHeader>
            <CardTitle>All Announcements</CardTitle>
            <CardDescription>Manage your announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">No announcements yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create your first announcement to notify users
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {announcements.map((announcement) => {
                    const priorityConfig = getPriorityConfig(announcement.priority)
                    const Icon = priorityConfig.icon
                    
                    return (
                      <div
                        key={announcement.id}
                        className={`p-3 sm:p-4 border rounded-lg ${!announcement.isActive ? 'opacity-60 bg-muted/50' : ''}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex gap-3 flex-1 min-w-0">
                            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${priorityConfig.bg}/10`}>
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${priorityConfig.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start sm:items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm sm:text-base">{announcement.title}</h4>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge variant={announcement.isActive ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                                    {announcement.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] sm:text-xs ${priorityConfig.color}`}>
                                    {priorityConfig.label}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                {announcement.content}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(announcement.createdAt), "MMM d, yyyy")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {announcement.readCount}/{announcement.totalUsers} ({announcement.readPercentage}%)
                                </span>
                                {announcement.expiresAt && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(announcement.expiresAt), "MMM d")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-start">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-9 sm:w-9"
                              onClick={() => toggleActive(announcement)}
                              title={announcement.isActive ? "Deactivate" : "Activate"}
                            >
                              {announcement.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 sm:h-9 sm:w-9"
                              onClick={() => openEditDialog(announcement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this announcement? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(announcement.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
