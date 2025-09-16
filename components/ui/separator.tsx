import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Separator({ className, ...props }: SeparatorProps) {
  return <div className={cn("shrink-0 bg-border", className)} role="separator" aria-orientation="horizontal" {...props} />
}

