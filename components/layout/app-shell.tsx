"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { TopHeader } from "./top-header"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

function AppShellContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isCollapsed, isHydrated } = useSidebar()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])
    
    // Pages where sidebar should be completely hidden (focused/immersive experiences)
    const isAuthPage = pathname?.startsWith("/auth")
    const isQuizPage = pathname?.startsWith("/quiz/") // Active quiz taking
    const isResultsPage = pathname?.startsWith("/results/") // Reviewing quiz results
    const isHomePage = pathname === "/" // Home redirect page
    const isAdminPage = pathname?.startsWith("/admin") // Admin pages don't need TopHeader
    
    // Check if this is a focused page (no sidebar needed)
    const isFocusedPage = isAuthPage || isQuizPage || isResultsPage || isHomePage

    // During SSR, render a simple container to prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="min-h-screen bg-background">
                {children}
            </div>
        )
    }

    // Auth pages - centered layout, no sidebar
    if (isAuthPage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                {children}
            </div>
        )
    }

    // Focused pages (quiz, results, home) - full screen, no sidebar
    if (isFocusedPage) {
        return (
            <div className="min-h-screen bg-background">
                {children}
            </div>
        )
    }

    return (
        <>
            <Sidebar />
            {!isAdminPage && <TopHeader />}
            <main
                className={cn(
                    "min-h-screen",
                    "mobile-header-safe-zone", // Dynamic top padding based on hamburger visibility
                    "md:pl-[300px]", // 280px sidebar + 16px left margin + 4px gap
                    isCollapsed && "md:pl-[100px]" // 80px collapsed + 16px left margin + 4px gap
                )}
                style={{
                    transition: isHydrated ? "padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1)" : "none"
                }}
            >
                <div className="container mx-auto p-4 sm:p-6 md:p-8">
                    {children}
                </div>
            </main>
        </>
    )
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppShellContent>{children}</AppShellContent>
        </SidebarProvider>
    )
}
