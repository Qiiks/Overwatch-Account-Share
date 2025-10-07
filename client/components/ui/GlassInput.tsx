"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded bg-cyan-500/3 backdrop-blur-md border border-cyan-400/20 px-3 py-1 text-base text-cyan-400 placeholder:text-cyan-400/40 shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:border-cyan-400 focus-visible:shadow-lg focus-visible:shadow-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-cyan-400/30 font-mono",
        className,
      )}
      ref={ref}
      {...props}
      style={{
        textShadow: "0 0 5px rgba(0, 255, 255, 0.3)",
        ...props.style,
      }}
    />
  )
})
GlassInput.displayName = "GlassInput"

export { GlassInput }
