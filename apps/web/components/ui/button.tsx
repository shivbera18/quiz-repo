import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-dark text-white hover:bg-green hover:text-black",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-black bg-transparent hover:bg-black hover:text-white",
        secondary:
          "bg-gray text-black hover:bg-dark hover:text-white",
        ghost: "hover:bg-gray hover:text-black",
        link: "text-dark underline-offset-4 hover:underline",
        // Reference-aligned Positivus variants
        positivus: "bg-green text-black hover:bg-white border border-dark",
        positivusDark: "bg-dark text-white hover:bg-green hover:text-black border border-dark",
        positivusOutline: "border border-dark bg-white text-black hover:bg-black hover:text-white",
        // Legacy neobrutalist kept for backward compat but muted to reference style
        neobrutalist: "bg-green text-black border border-dark shadow-[0px_5px_0px_#191a23] hover:translate-y-[-1px]",
        neobrutalistInverted: "bg-dark text-white border border-dark shadow-[0px_5px_0px_#191a23] hover:translate-y-[-1px]",
      },
      size: {
        default: "h-[56px] px-[35px] py-5",
        sm: "h-9 px-3 rounded-[10px] text-xs",
        lg: "h-[60px] px-8 py-5 text-base font-medium",
        icon: "h-11 w-11",
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
