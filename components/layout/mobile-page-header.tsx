"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Menu, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-context"

interface MobilePageHeaderProps {
  title: string
  subtitle: string
  backHref?: string
  /** Action button to show in header - renders in both mobile and desktop */
  action?: React.ReactNode
  /** Mobile-specific action (icon only) - if provided, overrides action on mobile */
  mobileAction?: React.ReactNode
}

export function MobilePageHeader({ title, subtitle, backHref = "/dashboard", action, mobileAction }: MobilePageHeaderProps) {
  const { isMobileOpen, setIsMobileOpen } = useSidebar()
  const [isAtTop, setIsAtTop] = React.useState(true)

  React.useEffect(() => {
    const handleScroll = () => {
      const atTop = window.scrollY <= 50
      setIsAtTop(atTop)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Use mobileAction if provided, otherwise use action for mobile
  const mobileActionElement = mobileAction || action

  return (
    <div>
      {/* Mobile Header - slides up on scroll */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm"
        initial={{ y: 0 }}
        animate={{ y: isAtTop ? 0 : -120 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <div className="px-4 pt-4 pb-3">
          {/* Row 1: Hamburger + Heading + Action */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-zinc-900 border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] transition-all"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-black tracking-tight truncate flex-1">{title}</h1>
            {/* Mobile action */}
            {mobileActionElement && <div className="shrink-0">{mobileActionElement}</div>}
          </div>
          
          {/* Row 2: Back button + Subheading */}
          <div className="flex items-center gap-3 mt-2">
            <Link href={backHref}>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-lg border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-yellow-300 dark:bg-yellow-400 hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground font-medium truncate">{subtitle}</p>
          </div>
        </div>
      </motion.div>

      {/* Spacer for mobile to prevent content from going under fixed header */}
      {/* Header: pt-4(16) + row1(40) + mt-2(8) + row2(40) + pb-3(12) + shadow(4) = 120px */}
      <div className="h-[112px] md:hidden" />

      {/* Desktop Header - static, with back button and action */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={backHref}>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 shrink-0 rounded-lg border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-yellow-300 dark:bg-yellow-400 hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
          </div>
        </div>
        {/* Desktop action - full button */}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
