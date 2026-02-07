import type React from "react";
import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { SettingsProvider } from "@/context/SettingsContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "SecureVault - Credential & OTP Sharing Platform",
  description:
    "Secure credential and OTP sharing platform for teams and individuals",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans ${outfit.variable} ${inter.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <SettingsProvider>
          <Suspense fallback={null}>
            {children}
            <Toaster richColors theme="dark" />
          </Suspense>
        </SettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}
