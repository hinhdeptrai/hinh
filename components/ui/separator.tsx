import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn("shrink-0 bg-border", className)} 
        role="separator" 
        aria-orientation="horizontal" 
        {...props} 
      />
    )
  }
)
Separator.displayName = "Separator"

