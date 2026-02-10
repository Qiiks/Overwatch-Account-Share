"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-md border relative overflow-hidden cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet-500/10 to-purple-400/5 text-[#DA70D6] border-[#8A2BE2]/30 hover:from-violet-500/20 hover:to-purple-400/10 hover:shadow-lg hover:shadow-[#8A2BE2]/25 hover:-translate-y-0.5 hover:border-[#8A2BE2]/50",
        primary:
          "bg-gradient-to-r from-violet-500/20 to-purple-400/10 text-[#DA70D6] border-[#8A2BE2]/40 hover:from-violet-500/30 hover:to-purple-400/15 hover:shadow-xl hover:shadow-[#8A2BE2]/30 hover:-translate-y-1 hover:border-[#8A2BE2]/60",
        ghost:
          "bg-violet-500/5 text-[#EAEAEA] border-[#8A2BE2]/20 hover:bg-violet-500/10 hover:text-[#DA70D6] hover:border-[#8A2BE2]/40",
        destructive:
          "bg-gradient-to-r from-red-500/20 to-red-400/10 text-red-400 border-red-400/30 hover:from-red-500/30 hover:to-red-400/15 hover:shadow-lg hover:shadow-red-400/25",
        success:
          "bg-gradient-to-r from-green-500/20 to-green-400/10 text-green-400 border-green-400/30 hover:from-green-500/30 hover:to-green-400/15 hover:shadow-lg hover:shadow-green-400/25",
        warning:
          "bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-yellow-400 border-yellow-400/30 hover:from-yellow-500/30 hover:to-orange-500/15 hover:shadow-lg hover:shadow-yellow-400/25",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-10 rounded px-8",
        icon: "h-9 w-9",
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
        style={{
          textShadow: "0 0 10px rgba(138, 43, 226, 0.3)",
          ...props.style,
        }}
      />
    );
  },
);
GlassButton.displayName = "GlassButton";

export { GlassButton, glassButtonVariants };
