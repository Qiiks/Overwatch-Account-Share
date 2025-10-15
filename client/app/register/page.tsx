"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard"
import { DotGrid } from "@/components/DotGrid"
import Link from "next/link"
import { useSettings } from "@/context/SettingsContext"
import { apiPost, clearStoredAuthSession } from "@/lib/api"

function validatePassword(password: string): string | null {
  // Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special @$!%*?&
  if (password.length < 8) {
    return "Password must be at least 8 characters long."
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter."
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter."
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit."
  }
  if (!/[@$!%*?&]/.test(password)) {
    return "Password must contain at least one special character (@$!%*?&)."
  }
  return null
}

export default function RegisterPage() {
  const router = useRouter()
  const { settings, loading } = useSettings()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Redirect to login if registration is disabled
  useEffect(() => {
    if (!loading && settings && !settings.allow_registration) {
      router.push("/login")
    }
  }, [settings, loading, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "password") {
      setPasswordError(validatePassword(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const passwordValidation = validatePassword(formData.password)
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords don't match")
      return
    }

    if (!acceptTerms || !acceptPrivacy) {
      alert("Please accept the Terms of Service and Privacy Policy")
      return
    }

    setIsLoading(true)

    try {
      const data = await apiPost<{ token?: string; role?: string; tokenExpiresAt?: string }>('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })

      clearStoredAuthSession()

      if (data.token) {
        localStorage.setItem("auth_token", data.token)
      }
      if (data.tokenExpiresAt) {
        localStorage.setItem("auth_token_expires_at", String(new Date(data.tokenExpiresAt).getTime()))
      }
      localStorage.setItem("user_role", data.role || "user")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Registration error:", error)
      setPasswordError(error.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while settings are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
        <DotGrid />
        <div className="relative z-10 w-full max-w-md px-4">
          <GlassCard>
            <GlassCardHeader className="text-center">
              <GlassCardTitle className="text-2xl font-bold text-[#8A2BE2]">Loading...</GlassCardTitle>
            </GlassCardHeader>
          </GlassCard>
        </div>
      </div>
    )
  }

  // Show registration closed message if registration is disabled
  if (settings && !settings.allow_registration) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
        <DotGrid />
        <div className="relative z-10 w-full max-w-md px-4">
          <GlassCard>
            <GlassCardHeader className="text-center">
              <GlassCardTitle className="text-2xl font-bold text-[#DA70D6]">Registration Closed</GlassCardTitle>
              <GlassCardDescription className="text-[#EAEAEA]/70">
                New user registration is currently disabled. Please contact an administrator.
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <GlassButton onClick={() => router.push("/login")} className="w-full">
                Back to Login
              </GlassButton>
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
            <GlassCardTitle className="text-2xl font-bold text-[#8A2BE2]">Create Account</GlassCardTitle>
            <GlassCardDescription className="text-[#EAEAEA]/70">
              Join SecureVault and start managing your credentials securely
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#EAEAEA]">
                  Username
                </Label>
                <GlassInput
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email
                </Label>
                <GlassInput
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#EAEAEA]">
                  Password
                </Label>
                <GlassInput
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Create a strong password"
                  required
                />
                <div className="mt-2 text-xs text-[#EAEAEA]/60 bg-[#222]/50 rounded p-2">
                  <div className="font-semibold text-[#8A2BE2] mb-1">Password requirements:</div>
                  <ul className="list-disc pl-5">
                    <li>At least 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one digit</li>
                    <li>At least one special character: <span className="font-mono">@ $ ! % * ? &</span></li>
                  </ul>
                </div>
                {passwordError && (
                  <div className="mt-2 text-xs text-[#DA70D6] bg-[#222]/70 rounded p-2">
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#EAEAEA]">
                  Confirm Password
                </Label>
                <GlassInput
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm text-[#EAEAEA]/70 leading-relaxed">
                    I accept the{" "}
                    <Link href="/terms" className="text-[#8A2BE2] hover:text-[#8A2BE2]/80 transition-colors">
                      Terms of Service
                    </Link>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={acceptPrivacy}
                    onCheckedChange={(checked) => setAcceptPrivacy(checked as boolean)}
                  />
                  <Label htmlFor="privacy" className="text-sm text-[#EAEAEA]/70 leading-relaxed">
                    I accept the{" "}
                    <Link href="/privacy" className="text-[#DA70D6] hover:text-[#DA70D6]/80 transition-colors">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </div>

              <GlassButton type="submit" className="w-full" disabled={isLoading || !acceptTerms || !acceptPrivacy}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </GlassButton>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm text-[#EAEAEA]/70">
                Already have an account?{" "}
                <Link href="/login" className="text-[#8A2BE2] hover:text-[#8A2BE2]/80 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
