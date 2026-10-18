import type React from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

/* Self-hosted Geist (design/previews/fonts) — no build-time Google fetch. */
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Overwatch Share — Account & OTP Sharing",
  description:
    "Share Overwatch accounts safely: owners choose who has access, and Battle.net login codes are relayed automatically from the linked mailbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <SettingsProvider>
            <Suspense fallback={null}>
              <AppShell>{children}</AppShell>
              <Toaster richColors theme="dark" />
            </Suspense>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
