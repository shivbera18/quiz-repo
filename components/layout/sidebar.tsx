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
                    !isHydrated && "invisible"
                )}
                style={{ 
                    height: "calc(100vh - 32px)",
                    transition: isHydrated ? "width 250ms cubic-bezier(0.4, 0, 0.2, 1)" : "none"
                }}
            >
                {/* Header */}
                <div className="flex h-20 items-center justify-between px-6">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {/* App Icon - Always visible */}
                        <div 
                            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                            style={{ background: 'linear-gradient(to bottom right, #7c3aed, #2563eb)' }}
                        >
                            Q
                        </div>
                        {/* Text - Animated */}
                        <div 
                            className={cn(
                                "overflow-hidden whitespace-nowrap transition-all duration-250 ease-out",
                                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                            )}
                            style={{ 
                                transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out"
                            }}
                        >
                            <span className="text-2xl font-bold tracking-tight">uizzy</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "hidden md:flex transition-opacity duration-200",
                            isCollapsed && "absolute right-2"
                        )}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 space-y-2 px-4 py-6 overflow-hidden">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ||
                            (item.href === '/admin' && pathname.startsWith('/admin'))
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                                        isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                    style={{ transition: "padding 250ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms ease" }}
                                >
                                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                                    <span 
                                        className={cn(
                                            "whitespace-nowrap overflow-hidden transition-all",
                                            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                                        )}
                                        style={{ transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease" }}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t p-4">
                    <div 
                        className={cn("flex items-center gap-3 transition-all duration-250", isCollapsed ? "flex-col justify-center" : "justify-between")}
                        style={{ transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)" }}
                    >
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
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                    style={{ background: 'linear-gradient(to bottom right, #7c3aed, #2563eb)' }}
                                >
                                    Q
                                </div>
                                <span className="text-2xl font-bold tracking-tight">uizzy</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
                            {sidebarItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href)) ||
                                    (item.href === '/admin' && pathname.startsWith('/admin'))
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
