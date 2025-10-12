"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DotGrid } from "@/components/DotGrid"
import Link from "next/link"
import { apiPost } from "@/lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await apiPost('/api/auth/reset-password', {
        email,
        password: "TempPass1!"
      })
      
      setIsSubmitted(true)
    } catch (error: any) {
      console.error("Forgot password error:", error)
      alert(error.message || "Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
        <DotGrid />

        <div className="relative z-10 w-full max-w-md px-4">
          <GlassCard>
            <GlassCardHeader className="text-center">
              <GlassCardTitle className="text-2xl font-bold text-[#DA70D6]">Check Your Email</GlassCardTitle>
              <GlassCardDescription className="text-[#EAEAEA]/70">
                We've sent password reset instructions to your email address
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="text-center text-[#EAEAEA]/80">
                <p className="mb-4">
                  If an account with email <strong>{email}</strong> exists, you will receive a password reset link
                  shortly.
                </p>
                <p className="text-sm text-[#EAEAEA]/60">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>

              <div className="space-y-2">
                <GlassButton onClick={() => setIsSubmitted(false)} variant="ghost" className="w-full">
                  Try Different Email
                </GlassButton>
                <GlassButton onClick={() => router.push("/login")} className="w-full">
                  Back to Login
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
      <DotGrid />

      <div className="relative z-10 w-full max-w-md px-4">
        <GlassCard>
          <GlassCardHeader className="text-center">
            <GlassCardTitle className="text-2xl font-bold text-[#8A2BE2]">Reset Password</GlassCardTitle>
            <GlassCardDescription className="text-[#EAEAEA]/70">
              Enter your email address and we'll send you a link to reset your password
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email Address
                </Label>
                <GlassInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <GlassButton type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </GlassButton>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link href="/login" className="text-sm text-[#DA70D6] hover:text-[#DA70D6]/80 transition-colors">
                Back to Login
              </Link>
              <div className="text-sm text-[#EAEAEA]/70">
                Don't have an account?{" "}
                <Link href="/register" className="text-[#8A2BE2] hover:text-[#8A2BE2]/80 transition-colors">
                  Sign up
                </Link>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
