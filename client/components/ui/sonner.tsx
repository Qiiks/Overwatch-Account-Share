"use client"

import type React from "react"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/* Dark-only product: the toast surface is fixed to the DISPATCH panel tokens. */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-line-2 group-[.toaster]:bg-panel-2 group-[.toaster]:font-sans group-[.toaster]:text-base group-[.toaster]:text-ink",
        description: "group-[.toast]:text-sm group-[.toast]:text-ink-3",
        actionButton:
          "group-[.toast]:rounded-md group-[.toast]:bg-signal group-[.toast]:font-semibold group-[.toast]:text-signal-ink",
        cancelButton:
          "group-[.toast]:rounded-md group-[.toast]:border group-[.toast]:border-line-2 group-[.toast]:bg-panel group-[.toast]:text-ink-2",
        error: "group-[.toaster]:border-alarm/40",
        success: "group-[.toaster]:border-signal/40",
      },
    }}
    {...props}
  />
)

export { Toaster }
