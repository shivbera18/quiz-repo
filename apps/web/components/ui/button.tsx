import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96] hover:-translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ghost: "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        link: "text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        neobrutalist: "border-2 border-black dark:border-white bg-[#B9FF66] text-[#191A23] shadow-[4px_4px_0px_0px_#191A23] dark:shadow-[4px_4px_0px_0px_#FFF] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold",
        neobrutalistInverted: "border-2 border-black dark:border-white bg-[#191A23] text-white shadow-[4px_4px_0px_0px_#191A23] dark:shadow-[4px_4px_0px_0px_#FFF] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold",
        positivus: "border-2 border-[#191A23] dark:border-white bg-[#B9FF66] text-[#191A23] shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#FFF] hover:translate-y-[-2px] hover:shadow-[0px_7px_0px_0px_#191A23] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_#191A23] transition-all font-bold rounded-[14px]",
        positivusDark: "border-2 border-[#191A23] dark:border-white bg-[#191A23] text-white shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#FFF] hover:bg-[#B9FF66] hover:text-[#191A23] hover:translate-y-[-2px] active:translate-y-[2px] transition-all font-bold rounded-[14px]",
        positivusOutline: "border-2 border-[#191A23] dark:border-white bg-transparent text-[#191A23] dark:text-white shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#FFF] hover:bg-[#F3F3F3] dark:hover:bg-white/10 hover:translate-y-[-2px] transition-all font-bold rounded-[14px]",
      },
      size: {
        default: "h-11 px-5 py-2.5 rounded-[14px]",
        sm: "h-9 px-3 rounded-[10px] text-xs",
        lg: "h-14 px-8 py-4 rounded-[14px] text-base font-bold",
        icon: "h-11 w-11 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
