"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded border bg-purple-500/5 backdrop-blur-md border-purple-500/20 shadow-lg shadow-black/50 text-card-foreground relative overflow-hidden",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/5 before:to-transparent before:pointer-events-none",
      "after:absolute after:inset-0 after:bg-[linear-gradient(45deg,transparent_48%,rgba(138,43,226,0.1)_49%,rgba(138,43,226,0.1)_51%,transparent_52%)] after:bg-[length:20px_20px] after:pointer-events-none after:opacity-20",
      className,
    )}
    {...props}
    style={{
      boxShadow:
        "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(138, 43, 226, 0.1), 0 0 20px rgba(138, 43, 226, 0.1)",
      ...props.style,
    }}
  />
));
GlassCard.displayName = "GlassCard";

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

const GlassCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
GlassCardDescription.displayName = "GlassCardDescription";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
};
