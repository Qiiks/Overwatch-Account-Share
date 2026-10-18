"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-base font-semibold tracking-[0.01em] transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-standard active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-line-2 bg-panel text-ink hover:bg-white/5",
        primary:
          "border-signal bg-signal text-signal-ink hover:border-accent hover:bg-accent",
        ghost:
          "border-line-2 text-ink-2 hover:bg-white/5 hover:text-ink",
        destructive: "border-alarm/40 text-alarm hover:bg-alarm/10",
        success: "border-signal/40 text-signal hover:bg-signal/10",
        warning: "border-warn/40 text-warn hover:bg-warn/10",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-3 text-sm",
        lg: "h-11 px-5 text-md",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface GlassButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
