"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
    LayoutDashboard, 
    Users, 
    Database, 
    BarChart2,
    ChevronRight,
    Shield
} from "lucide-react"

const adminNavItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin", exact: true },
    { icon: Users, label: "Users", href: "/admin/users" },
    { icon: Database, label: "Questions", href: "/admin/question-bank" },
    { icon: BarChart2, label: "Analytics", href: "/admin/analytics" },
]

export function AdminSubNav() {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return <div className="mb-6 h-12" /> // Placeholder to prevent layout shift
    }

    // Only show on admin pages
    if (!pathname?.startsWith('/admin')) {
        return null
    }

    return (
        <div className="mb-6">
            {/* Desktop: Horizontal tabs */}
            <div className="hidden sm:block">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                    {adminNavItems.map((item) => {
                        const isActive = item.exact 
                            ? pathname === item.href 
                            : pathname.startsWith(item.href)
                        
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                        isActive 
                                            ? "bg-background shadow-sm text-foreground" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Mobile: Scrollable pills */}
            <div className="sm:hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {adminNavItems.map((item) => {
                        const isActive = item.exact 
                            ? pathname === item.href 
                            : pathname.startsWith(item.href)
                        
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                                        isActive 
                                            ? "bg-primary text-primary-foreground border-primary" 
                                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                                    )}
                                >
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{item.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Breadcrumb for sub-pages */}
            {pathname !== '/admin' && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-3">
                    <Link href="/admin" className="hover:text-foreground transition-colors flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5" />
                        Admin
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium">
                        {adminNavItems.find(item => 
                            item.exact ? pathname === item.href : pathname.startsWith(item.href)
                        )?.label || 'Page'}
                    </span>
                    {/* Show quiz name for quiz editor */}
                    {pathname.match(/^\/admin\/quiz\/[^/]+$/) && (
                        <>
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span className="text-foreground font-medium truncate max-w-[150px]">
                                Quiz Editor
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
