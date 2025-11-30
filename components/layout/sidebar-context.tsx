"use client"

import * as React from "react"

interface SidebarContextType {
    isCollapsed: boolean
    setIsCollapsed: (value: boolean) => void
    isMobileOpen: boolean
    setIsMobileOpen: (value: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const [isMobileOpen, setIsMobileOpen] = React.useState(false)

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                setIsCollapsed,
                isMobileOpen,
                setIsMobileOpen,
            }}
        >
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
