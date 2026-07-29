"use client"

import * as React from "react"

interface SidebarContextType {
    isCollapsed: boolean
    setIsCollapsed: (value: boolean) => void
    isMobileOpen: boolean
    setIsMobileOpen: (value: boolean) => void
    isHydrated: boolean
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Initialize with null to indicate "not yet loaded"
    const [isCollapsed, setIsCollapsedState] = React.useState<boolean | null>(null)
    const [isMobileOpen, setIsMobileOpen] = React.useState(false)
    const [isHydrated, setIsHydrated] = React.useState(false)

    // Load collapsed state from localStorage on mount
    React.useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed")
        setIsCollapsedState(stored === "true")
        setIsHydrated(true)
    }, [])

    // Persist collapsed state to localStorage
    const setIsCollapsed = React.useCallback((value: boolean) => {
        setIsCollapsedState(value)
        localStorage.setItem("sidebar-collapsed", String(value))
    }, [])

    const contextValue = React.useMemo(() => ({
        // Use false as default only after hydration
        isCollapsed: isCollapsed ?? false,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        isHydrated,
    }), [isCollapsed, isHydrated, setIsCollapsed, isMobileOpen])

    return (
        <SidebarContext.Provider value={contextValue}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}
