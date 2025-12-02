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

// Consistent navigation items (same for everyone)
const baseSidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Quizzes", href: "/dashboard/full-mock-tests" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Profile", href: "/profile" },
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
            // Update CSS variable for dynamic padding - reduced for less mobile gap
            document.documentElement.style.setProperty(
                '--mobile-header-padding', 
                atTop ? '3.25rem' : '0rem'
            )
        }
        
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Check initial position
        
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isAdmin = user?.isAdmin || user?.userType === 'admin'

    // Always same sidebar items, just add admin link for admins
    const sidebarItems = React.useMemo(() => {
        const items = [...baseSidebarItems]
        if (isAdmin) {
            items.push({ icon: Shield, label: "Admin Panel", href: "/admin" })
        }
        return items
    }, [isAdmin])

    return (
        <>
            {/* Mobile Menu Button - Neo Brutalism Style */}
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
                            className="rounded-lg bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#fff] transition-all"
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

            {/* Desktop Sidebar - Neo Brutalism Design */}
            <aside
                className={cn(
                    "fixed top-4 left-4 z-40 border-4 border-black rounded-lg bg-white dark:bg-zinc-900 dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] hidden md:flex flex-col",
                    isCollapsed ? "w-20" : "w-[280px]",
                    !isHydrated && "invisible"
                )}
                style={{ 
                    height: "calc(100vh - 32px)",
                    transition: isHydrated ? "width 250ms cubic-bezier(0.4, 0, 0.2, 1)" : "none"
                }}
            >
                {/* Header */}
                <div className={cn(
                    "flex h-20 items-center border-b-4 border-black dark:border-white",
                    isCollapsed ? "justify-center px-2" : "justify-between px-6"
                )}>
                    {/* App Name - Text only (hidden when collapsed) */}
                    {!isCollapsed && (
                        <span className="text-2xl font-black tracking-tight text-black dark:text-white">
                            Quizzy
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex h-10 w-10 hover:bg-yellow-300 dark:hover:bg-yellow-400 hover:border-2 hover:border-black dark:hover:border-white rounded-md transition-all focus:bg-transparent active:bg-yellow-300 dark:active:bg-yellow-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Nav Items */}
                <nav className={cn(
                    "flex-1 space-y-4 py-6 overflow-hidden flex flex-col",
                    isCollapsed ? "items-center px-0" : "items-stretch px-4"
                )}>
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ||
                            (item.href === '/admin' && pathname.startsWith('/admin'))
                        return (
                            <Link key={item.href} href={item.href} className={isCollapsed ? "" : "w-full"}>
                                <div
                                    className={cn(
                                        "flex items-center rounded-lg text-sm font-bold border-2 border-black dark:border-white transition-all duration-200",
                                        isActive 
                                            ? "bg-yellow-300 dark:bg-yellow-400 text-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] translate-x-0 translate-y-0" 
                                            : "bg-white dark:bg-zinc-800 hover:bg-blue-300 dark:hover:bg-blue-400 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px]",
                                        isCollapsed ? "h-12 w-12 justify-center" : "gap-3 px-4 py-3 w-full"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5 flex-shrink-0")} />
                                    {!isCollapsed && (
                                        <span className="whitespace-nowrap">
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t-4 border-black dark:border-white p-4">
                    <div 
                        className={cn("flex items-center gap-3 transition-all duration-250", isCollapsed ? "flex-col justify-center" : "justify-between")}
                        style={{ transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)" }}
                    >
                        <div className="border-2 border-black dark:border-white rounded-md hover:bg-purple-300 dark:hover:bg-purple-400 transition-all">
                            <ThemeToggle />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="border-2 border-black dark:border-white rounded-md hover:bg-red-300 dark:hover:bg-red-400 text-black dark:text-white"
                            onClick={logout}
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar - Neo Brutalism */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.aside
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 z-50 w-72 border-r-4 border-black dark:border-white bg-white dark:bg-zinc-900 md:hidden flex flex-col shadow-[8px_0px_0px_0px_#000] dark:shadow-[8px_0px_0px_0px_#fff]"
                    >
                        <div className="flex h-16 items-center justify-between px-6 shrink-0 border-b-4 border-black dark:border-white">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black tracking-tight text-black dark:text-white">Quizzy</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMobileOpen(false)}
                                className="border-2 border-black dark:border-white rounded-md hover:bg-red-300 dark:hover:bg-red-400"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <nav className="flex-1 space-y-5 px-5 py-6 overflow-y-auto">
                            {sidebarItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ||
                                    (item.href === '/admin' && pathname.startsWith('/admin'))
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold border-2 border-black dark:border-white transition-all",
                                                isActive 
                                                    ? "bg-yellow-300 dark:bg-yellow-400 text-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]" 
                                                    : "bg-white dark:bg-zinc-800 hover:bg-blue-300 dark:hover:bg-blue-400 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5")} />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="border-t-4 border-black dark:border-white p-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="border-2 border-black dark:border-white rounded-md hover:bg-purple-300 dark:hover:bg-purple-400 transition-all">
                                    <ThemeToggle />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="border-2 border-black dark:border-white rounded-md hover:bg-red-300 dark:hover:bg-red-400 text-black dark:text-white"
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
