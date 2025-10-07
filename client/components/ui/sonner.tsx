"use client"

import type React from "react"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#111111]/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-[#EAEAEA] group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[#EAEAEA]/70",
          actionButton: "group-[.toast]:bg-[#8A2BE2] group-[.toast]:text-[#EAEAEA]",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-[#EAEAEA]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
