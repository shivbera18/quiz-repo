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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSidebar } from "./sidebar-context"
import { useAuth } from "@/hooks/use-auth"

const baseSidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Quizzes", href: "/dashboard/full-mock-tests" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Profile", href: "/profile" },
]


export function Sidebar() {
    const pathname = usePathname()
    const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
    const { user, logout } = useAuth()
    
    // Scroll-based hamburger visibility (only show at top)
    const [isAtTop, setIsAtTop] = React.useState(true)
    
    React.useEffect(() => {
        const handleScroll = () => {
            // Show hamburger only when at top (within 50px threshold)
            setIsAtTop(window.scrollY <= 50)
        }
        
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Check initial position
        
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Add admin link if user is admin
    const sidebarItems = React.useMemo(() => {
        const items = [...baseSidebarItems]
        if (user?.isAdmin || user?.userType === 'admin') {
            items.push({ icon: Shield, label: "Admin Panel", href: "/admin" })
        }
        return items
    }, [user])

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
            <motion.aside
                className={cn(
                    "fixed top-4 left-4 z-40 border rounded-2xl bg-card/80 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out hidden md:flex flex-col",
                    isCollapsed ? "w-20" : "w-[280px]"
                )}
                style={{ height: "calc(100vh - 32px)" }}
                initial={false}
                animate={{ width: isCollapsed ? 80 : 280 }}
            >
                {/* Header */}
                <div className="flex h-20 items-center justify-between px-6">
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-2xl font-bold tracking-tight"
                            >
                                Quizzy
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

                {/* Nav Items */}
                <nav className="flex-1 space-y-2 px-4 py-6">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href}>
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
            </motion.aside>

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
                            <span className="text-2xl font-bold tracking-tight">Quizzy</span>
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
                            {sidebarItems.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
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
