"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type GlassInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      /* 16px on touch sizes: anything smaller makes iOS Safari zoom the field on focus. */
      className={cn(
        "flex h-10 w-full rounded-lg border border-line-2 bg-panel-2 px-3 py-1 text-[16px] text-ink transition-colors duration-[var(--dur-2)] ease-standard placeholder:text-ink-3 selection:bg-signal selection:text-signal-ink focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className,
      )}
      {...props}
    />
  ),
);
GlassInput.displayName = "GlassInput";

export { GlassInput };
