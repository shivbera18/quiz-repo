"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

function AppShellContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isCollapsed } = useSidebar()
    const isAuthPage = pathname?.startsWith("/auth")
    const isQuizPage = pathname?.startsWith("/quiz/") // Hide sidebar during active quiz

    // Auth pages - centered layout, no sidebar
    if (isAuthPage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                {children}
            </div>
        )
    }

    // Quiz pages - full screen, no sidebar (to avoid distractions during tests)
    if (isQuizPage) {
        return (
            <div className="min-h-screen bg-background">
                {children}
            </div>
        )
    }

    return (
        <>
            <Sidebar />
            <main
                className={cn(
                    "min-h-screen transition-all duration-300 ease-in-out",
                    "pt-16 md:pt-0", // Top padding on mobile for hamburger menu safe zone
                    "md:pl-[300px]", // 280px sidebar + 16px left margin + 4px gap
                    isCollapsed && "md:pl-[100px]" // 80px collapsed + 16px left margin + 4px gap
                )}
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
