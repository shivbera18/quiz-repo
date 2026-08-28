import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'neobrutalist' | 'positivus' | 'positivusDark' | 'positivusGreen' | 'positivusGrey'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: "rounded-[45px] border border-dark bg-white text-black shadow-[0px_5px_0px_#191a23]",
      neobrutalist: "rounded-[45px] border border-dark bg-white shadow-[0px_5px_0px_#191a23]",
      positivus: "rounded-[45px] border border-dark bg-white text-black shadow-[0px_5px_0px_#191a23]",
      positivusDark: "rounded-[45px] border border-dark bg-dark text-white shadow-[0px_5px_0px_#191a23]",
      positivusGreen: "rounded-[45px] border border-dark bg-green text-black shadow-[0px_5px_0px_#191a23]",
      positivusGrey: "rounded-[45px] border border-dark bg-gray text-black shadow-[0px_5px_0px_#191a23]",
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
      "text-2xl font-medium leading-none tracking-tight font-grotesk",
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
