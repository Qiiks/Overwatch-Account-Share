import type React from "react";
import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
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
      <body
        className={`font-sans ${outfit.variable} ${inter.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <AuthProvider>
          <SettingsProvider>
            <Suspense fallback={null}>
              {children}
              <Toaster richColors theme="dark" />
            </Suspense>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
