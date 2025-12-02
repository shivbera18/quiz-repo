"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, AlertCircle, Info, AlertTriangle, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth"
import { format } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"

interface Announcement {
  id: string
  title: string
  content: string
  priority: "low" | "normal" | "high" | "urgent"
  createdAt: string
  expiresAt: string | null
  isRead: boolean
}

const priorityConfig = {
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", badge: "bg-blue-500" },
  normal: { icon: Megaphone, color: "text-primary", bg: "bg-primary/10", badge: "bg-primary" },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", badge: "bg-orange-500" },
  urgent: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "bg-red-500" }
}

// Shared Announcement Content Component
function AnnouncementContent({ 
  announcements, 
  unreadCount, 
  loading, 
  markAsRead, 
  markAllAsRead 
}: {
  announcements: Announcement[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between p-4 border-b-2 border-black dark:border-white">
        <h3 className="font-bold">Announcements</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 font-bold hover:bg-yellow-300 dark:hover:bg-yellow-400"
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[300px]">
        {loading && announcements.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <Bell className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No announcements</p>
          </div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {announcements.map((announcement, index) => {
              const config = priorityConfig[announcement.priority]
              const Icon = config.icon
              return (
                <div
                  key={announcement.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !announcement.isRead && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!announcement.isRead) {
                      markAsRead(announcement.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      config.badge
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                        <h4 className={cn(
                          "font-medium text-sm line-clamp-1",
                          !announcement.isRead && "font-semibold"
                        )}>
                          {announcement.title}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {announcement.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(announcement.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {!announcement.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </>
  )
}

export function TopHeader() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(true)
  const [lastScrollY, setLastScrollY] = React.useState(0)

  // Handle scroll to show/hide header
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Show header when at top or scrolling up, hide when scrolling down
      if (currentScrollY < 50) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Fetch announcements
  const fetchAnnouncements = React.useCallback(async () => {
    if (!user?.token) return

    try {
      setLoading(true)
      const response = await fetch("/api/announcements", {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  // Fetch on mount and when user changes
  React.useEffect(() => {
    fetchAnnouncements()
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  // Mark announcement as read
  const markAsRead = async (announcementId: string) => {
    if (!user?.token) return

    try {
      await fetch(`/api/announcements/${announcementId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })

      // Update local state
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, isRead: true } : a)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadAnnouncements = announcements.filter(a => !a.isRead)
    for (const announcement of unreadAnnouncements) {
      await markAsRead(announcement.id)
    }
  }

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!user) return null

  return (
    <>
      {/* Fixed Bell Icon - Top Right on Mobile - Neo Brutalism */}
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className="fixed top-4 right-4 z-50 md:hidden"
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
          >
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-10 w-10 rounded-lg border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#fff] bg-white dark:bg-zinc-900 transition-all"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-black">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-2rem)] max-w-96 p-0 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] rounded-lg mr-2"
                align="end"
                sideOffset={8}
              >
                <AnnouncementContent 
                  announcements={announcements}
                  unreadCount={unreadCount}
                  loading={loading}
                  markAsRead={markAsRead}
                  markAllAsRead={markAllAsRead}
                />
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Header - Hidden on Mobile - No Blur */}
      <div 
        className={cn(
          "hidden md:flex items-center justify-end gap-3 px-4 py-3 bg-background border-b-2 border-black dark:border-white sticky top-0 z-30 transition-all duration-300",
          !isVisible && "-translate-y-full opacity-0"
        )}
      >
        {/* Announcements Bell - Neo Brutalism */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 rounded-lg border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_#000] dark:hover:shadow-[5px_5px_0px_0px_#fff] bg-white dark:bg-zinc-900 transition-all"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-black">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 sm:w-96 p-0 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] rounded-lg"
            align="end"
            sideOffset={8}
          >
            <AnnouncementContent 
              announcements={announcements}
              unreadCount={unreadCount}
              loading={loading}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
            />
          </PopoverContent>
        </Popover>

        {/* Profile Avatar - Desktop only - Neo Brutalism */}
        <Link href="/profile">
          <Avatar className="h-10 w-10 border-2 border-black dark:border-white hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] hover:shadow-[5px_5px_0px_0px_#000] dark:hover:shadow-[5px_5px_0px_0px_#fff]">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="bg-yellow-400 text-black font-bold text-sm">
              {getInitials(user.name || "User")}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </>
  )
}
