"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

// Map of admin paths to readable names
const pathNameMap: Record<string, string> = {
    "admin": "Admin",
    "users": "Users",
    "question-bank": "Question Bank",
    "analytics": "Analytics",
    "advanced": "Advanced Analytics",
    "quiz": "Quiz Editor",
}

interface AdminBreadcrumbProps {
    className?: string
    // Optional custom title for dynamic routes like quiz/[id]
    currentPageTitle?: string
}

export function AdminBreadcrumb({ className, currentPageTitle }: AdminBreadcrumbProps) {
    const pathname = usePathname()
    
    // Split path and filter out empty strings
    const pathSegments = pathname.split('/').filter(Boolean)
    
    // Build breadcrumb items
    const breadcrumbItems = pathSegments.map((segment, index) => {
        const href = '/' + pathSegments.slice(0, index + 1).join('/')
        const isLast = index === pathSegments.length - 1
        
        // Use custom title for last item if provided, otherwise use map or segment
        let label = pathNameMap[segment] || segment
        if (isLast && currentPageTitle) {
            label = currentPageTitle
        }
        
        // Handle dynamic route segments (like [id])
        if (segment.match(/^[a-f0-9-]{20,}$/i)) {
            label = currentPageTitle || "Details"
        }
        
        return { href, label, isLast }
    })

    // Don't render if not in admin section or only on /admin
    if (!pathname.startsWith('/admin') || pathSegments.length <= 1) {
        return null
    }

    return (
        <nav 
            aria-label="Breadcrumb" 
            className={cn(
                "flex items-center gap-1 text-sm text-muted-foreground mb-4",
                className
            )}
        >
            {/* Admin home icon */}
            <Link 
                href="/admin" 
                className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
            </Link>

            {breadcrumbItems.slice(1).map((item, index) => (
                <div key={item.href} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    {item.isLast ? (
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                            {item.label}
                        </span>
                    ) : (
                        <Link 
                            href={item.href}
                            className="hover:text-foreground transition-colors truncate max-w-[150px]"
                        >
                            {item.label}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    )
}
