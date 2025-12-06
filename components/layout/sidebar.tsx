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
    Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-context"
import { useAuth } from "@/hooks/use-auth"

const baseSidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Quizzes", href: "/dashboard/full-mock-tests" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Settings", href: "/profile" },
]

export function Sidebar() {
    const pathname = usePathname()
    const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, isHydrated } = useSidebar()
    const { user, logout } = useAuth()
    
    const [isAtTop, setIsAtTop] = React.useState(true)
    
    const subpagesWithHeader = [
        '/dashboard/full-mock-tests',
        '/dashboard/sectional-tests',
        '/dashboard/attempted-quizzes',
        '/analytics',
        '/profile',
        '/admin',
        '/history',
    ]
    const isSubpageWithHeader = subpagesWithHeader.some(path => pathname?.startsWith(path))
    
    React.useEffect(() => {
        const handleScroll = () => {
            const atTop = window.scrollY <= 50
            setIsAtTop(atTop)
            document.documentElement.style.setProperty(
                '--mobile-header-padding', 
                atTop ? '3.25rem' : '0rem'
            )
        }
        
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isAdmin = user?.isAdmin || user?.userType === 'admin'

    const sidebarItems = React.useMemo(() => {
        const items = [...baseSidebarItems]
        if (isAdmin) {
            items.push({ icon: Shield, label: "Admin", href: "/admin" })
        }
        return items
    }, [isAdmin])

    return (
        <>
            {/* Mobile Menu Button */}
            {!isSubpageWithHeader && (
                <motion.div 
                    className="fixed top-4 left-4 z-50 md:hidden"
                    initial={{ y: 0 }}
                    animate={{ y: isAtTop ? 0 : -60 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className="h-10 w-10 rounded-lg bg-card border border-border"
                    >
                        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </motion.div>
            )}

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen bg-card border-r border-border hidden md:flex flex-col",
                    isCollapsed ? "w-[80px]" : "w-[280px]",
                    !isHydrated && "invisible"
                )}
                style={{ 
                    transition: isHydrated ? "width 200ms ease" : "none"
                }}
            >
                {/* Header */}
                <div className={cn(
                    "flex h-14 items-center border-b border-border px-4",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold text-sm">Quizzy</span>
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 p-3 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href !== '/dashboard' && item.href !== '/admin' && pathname?.startsWith(item.href)) ||
                            (item.href === '/admin' && pathname?.startsWith('/admin'))
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                        isActive 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 flex-shrink-0" />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border">
                    <Button 
                        variant="ghost" 
                        size={isCollapsed ? "icon" : "default"}
                        className={cn(
                            "text-muted-foreground hover:text-foreground",
                            !isCollapsed && "w-full justify-start gap-3"
                        )}
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4" />
                        {!isCollapsed && <span className="text-sm">Log out</span>}
                    </Button>
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
                        className="fixed inset-y-0 left-0 z-[60] w-72 bg-card border-r border-border md:hidden flex flex-col"
                    >
                        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-semibold text-sm">Quizzy</span>
                            </Link>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMobileOpen(false)}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <nav className="flex-1 p-3 space-y-1">
                            {sidebarItems.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== '/dashboard' && item.href !== '/admin' && pathname?.startsWith(item.href)) ||
                                    (item.href === '/admin' && pathname?.startsWith('/admin'))
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                                isActive 
                                                    ? "bg-primary/10 text-primary" 
                                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>

                        <div className="p-3 border-t border-border">
                            <Button 
                                variant="ghost" 
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={logout}
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Log out</span>
                            </Button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    )
}
