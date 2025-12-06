"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { TopHeader } from "./top-header"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import { Footer } from "./footer"
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
    const isMainDashboard = pathname === "/dashboard" // Only show TopHeader on main dashboard
    const isPrivacyOrTerms = pathname === "/privacy" || pathname === "/terms" // Privacy and Terms pages

    // Pages that use MobilePageHeader (they handle their own top spacing)
    const subpagesWithHeader = [
        '/dashboard/full-mock-tests',
        '/dashboard/sectional-tests',
        '/dashboard/attempted-quizzes',
        '/analytics',
        '/profile',
        '/admin',
        '/admin/users',
        '/admin/question-bank',
        '/admin/quiz',
        '/admin/analytics',
        '/privacy',
        '/terms',
    ]
    const hasMobilePageHeader = subpagesWithHeader.some(path => pathname?.startsWith(path))

    // Check if this is a focused page (no sidebar needed)
    const isFocusedPage = isAuthPage || isQuizPage || isResultsPage || isHomePage

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

    // For dashboard pages with sidebar - show content immediately
    // Sidebar will handle its own hydration
    return (
        <>
            {mounted && <Sidebar />}
            <main
                className={cn(
                    "min-h-screen flex flex-col",
                    // Only apply mobile-header-safe-zone to pages WITHOUT MobilePageHeader
                    // Pages with MobilePageHeader handle their own top spacing
                    !hasMobilePageHeader && "mobile-header-safe-zone",
                    mounted && "md:pl-[300px]", // Only apply sidebar padding after mount
                    mounted && isCollapsed && "md:pl-[100px]" // 80px collapsed + 16px left margin + 4px gap
                )}
                style={{
                    transition: isHydrated ? "padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1)" : "none"
                }}
            >
                {(isMainDashboard || isPrivacyOrTerms) && mounted && <TopHeader />}
                <div className="container mx-auto px-2 py-2 sm:p-6 md:p-8 flex-1">
                    {children}
                </div>
                {(isMainDashboard || isPrivacyOrTerms) && <Footer />}
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
