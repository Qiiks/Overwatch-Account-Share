"use client"

import { useRouter } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { DotGrid } from "@/components/DotGrid"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden">
      <Navigation />
      <DotGrid />

      <div className="relative z-10 container mx-auto px-4 py-8 pt-24 flex items-center justify-center min-h-[80vh]">
        <GlassCard className="max-w-md w-full text-center">
          <GlassCardHeader>
            <div className="text-8xl font-bold text-[#8A2BE2] mb-4">404</div>
            <GlassCardTitle className="text-2xl text-[#DA70D6] mb-2">Page Not Found</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-6">
            <p className="text-[#EAEAEA]/70 text-lg">
              The page you're looking for doesn't exist or has been moved to a more secure location.
            </p>

            <div className="space-y-3">
              <GlassButton onClick={() => router.push("/")} className="w-full" variant="primary">
                Go Home
              </GlassButton>

              <GlassButton onClick={() => router.back()} className="w-full" variant="ghost">
                Go Back
              </GlassButton>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-[#EAEAEA]/50">
                If you believe this is an error, please contact our support team.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
