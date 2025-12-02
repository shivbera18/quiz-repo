import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  neobrutalist?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, neobrutalist = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          neobrutalist
            ? "flex h-11 w-full rounded-lg border-4 border-black bg-background px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[4px_4px_0px_0px_#000] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 dark:border-white/20 dark:focus-visible:shadow-[4px_4px_0px_0px_#fff]"
            : "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
