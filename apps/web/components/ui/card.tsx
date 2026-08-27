import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'neobrutalist' | 'positivus' | 'positivusDark' | 'positivusGreen' | 'positivusGrey'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: "rounded-2xl border bg-card/50 backdrop-blur-sm text-card-foreground shadow-sm hover:shadow-md transition-all duration-200",
      neobrutalist: "rounded-2xl border-2 border-black dark:border-white bg-card shadow-[4px_4px_0px_0px_#191A23] dark:shadow-[4px_4px_0px_0px_#FFF] transition-all duration-200",
      positivus: "rounded-[35px] md:rounded-[45px] border-2 border-[#191A23] dark:border-white/30 bg-[#FFFFFF] dark:bg-[#1E1F2A] shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#000] text-foreground transition-all duration-200",
      positivusDark: "rounded-[35px] md:rounded-[45px] border-2 border-[#191A23] dark:border-white/30 bg-[#191A23] text-white shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#000] transition-all duration-200",
      positivusGreen: "rounded-[35px] md:rounded-[45px] border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[0px_5px_0px_0px_#191A23] transition-all duration-200",
      positivusGrey: "rounded-[35px] md:rounded-[45px] border-2 border-[#191A23] dark:border-white/30 bg-[#F3F3F3] dark:bg-[#232532] text-[#191A23] dark:text-white shadow-[0px_5px_0px_0px_#191A23] transition-all duration-200",
    }[variant]

    return (
      <div
        ref={ref}
        className={cn(variantClasses, className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
