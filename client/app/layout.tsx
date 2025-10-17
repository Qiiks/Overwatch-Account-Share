import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { Suspense } from "react"
import { SettingsProvider } from "@/context/SettingsContext"
import "./globals.css"

export const metadata: Metadata = {
  title: "SecureVault - Credential & OTP Sharing Platform",
  description: "Secure credential and OTP sharing platform for teams and individuals",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <SettingsProvider>
          <Suspense fallback={null}>
            {children}
            <Toaster />
          </Suspense>
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  )
}
