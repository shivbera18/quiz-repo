"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    BookOpen,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Shield,
    Users,
    Database,
    FileText,
    ArrowLeftFromLine,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSidebar } from "./sidebar-context"
import { useAuth } from "@/hooks/use-auth"

// Student navigation items
const studentSidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Quizzes", href: "/dashboard/full-mock-tests" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Profile", href: "/profile" },
]

// Admin navigation items
const adminSidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: Database, label: "Question Bank", href: "/admin/question-bank" },
    { icon: BarChart2, label: "Analytics", href: "/admin/analytics" },
    { icon: FileText, label: "Manage Quizzes", href: "/admin", hash: "#quizzes" },
]


export function Sidebar() {
    const pathname = usePathname()
    const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, isHydrated } = useSidebar()
    const { user, logout } = useAuth()
    
    // Scroll-based hamburger visibility (only show at top)
    const [isAtTop, setIsAtTop] = React.useState(true)
    
    React.useEffect(() => {
        const handleScroll = () => {
            // Show hamburger only when at top (within 50px threshold)
            const atTop = window.scrollY <= 50
            setIsAtTop(atTop)
            // Update CSS variable for dynamic padding
            document.documentElement.style.setProperty(
                '--mobile-header-padding', 
                atTop ? '4rem' : '0rem'
            )
        }
        
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Check initial position
        
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Determine if we're in admin section
    const isAdminSection = pathname.startsWith('/admin')
    const isAdmin = user?.isAdmin || user?.userType === 'admin'

    // Get appropriate sidebar items based on current section
    const sidebarItems = React.useMemo(() => {
        if (isAdminSection && isAdmin) {
            return adminSidebarItems
        }
        const items = [...studentSidebarItems]
        if (isAdmin) {
            items.push({ icon: Shield, label: "Admin Panel", href: "/admin" })
        }
        return items
    }, [isAdminSection, isAdmin])

    // Title based on section
    const sidebarTitle = isAdminSection ? "Admin" : "Quizzy"
    const exitLink = isAdminSection ? { href: "/dashboard", label: "Exit Admin", icon: ArrowLeftFromLine } : null

    return (
        <>
            {/* Mobile Menu Button - Floating, hides on scroll */}
            <AnimatePresence>
                {isAtTop && (
                    <motion.div 
                        className="fixed top-4 left-4 z-50 md:hidden"
                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 25 
                        }}
                    >
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="rounded-xl bg-card/90 backdrop-blur-md shadow-lg border"
                        >
                            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar - Floating Design */}
            <aside
                className={cn(
                    "fixed top-4 left-4 z-40 border rounded-2xl bg-card/80 backdrop-blur-xl shadow-xl hidden md:flex flex-col",
                    isCollapsed ? "w-20" : "w-[280px]",
                    // Hide until hydrated to prevent flash
                    !isHydrated && "invisible"
                )}
                style={{ 
                    height: "calc(100vh - 32px)",
                    // Only animate after hydration
                    transition: isHydrated ? "width 300ms ease-in-out" : "none"
                }}
            >
                {/* Header */}
                <div className="flex h-20 items-center justify-between px-6">
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-2"
                            >
                                {isAdminSection && <Shield className="h-5 w-5 text-blue-600" />}
                                <span className="text-2xl font-bold tracking-tight">{sidebarTitle}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Exit Admin Link (when in admin section) */}
                {exitLink && (
                    <div className="px-4 pb-2">
                        <Link href={exitLink.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all bg-muted/50 hover:bg-muted text-muted-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                            >
                                <exitLink.icon className="h-4 w-4" />
                                {!isCollapsed && <span>{exitLink.label}</span>}
                            </div>
                        </Link>
                    </div>
                )}

                {/* Nav Items */}
                <nav className="flex-1 space-y-2 px-4 py-6">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href !== '/admin' && pathname.startsWith(item.href))
                        return (
                            <Link key={item.href + (item.label)} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                                        isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t p-4">
                    <div className={cn("flex items-center gap-3", isCollapsed ? "flex-col justify-center" : "justify-between")}>
                        <ThemeToggle />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={logout}
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.aside
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 z-50 w-72 border-r bg-card md:hidden flex flex-col"
                    >
                        <div className="flex h-16 items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-2">
                                {isAdminSection && <Shield className="h-5 w-5 text-blue-600" />}
                                <span className="text-2xl font-bold tracking-tight">{sidebarTitle}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Exit Admin Link (when in admin section) */}
                        {exitLink && (
                            <div className="px-4 pb-2">
                                <Link href={exitLink.href} onClick={() => setIsMobileOpen(false)}>
                                    <div className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all bg-muted/50 hover:bg-muted text-muted-foreground">
                                        <exitLink.icon className="h-4 w-4" />
                                        <span>{exitLink.label}</span>
                                    </div>
                                </Link>
                            </div>
                        )}

                        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
                            {sidebarItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/admin' && pathname.startsWith(item.href))
                                return (
                                    <Link key={item.href + (item.label)} href={item.href} onClick={() => setIsMobileOpen(false)}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                                                isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="border-t p-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <ThemeToggle />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={logout}
                                >
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    )
}
