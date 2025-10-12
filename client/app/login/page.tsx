"use client"

import type React from "react"

import { useState } from "react"
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
import { apiPost } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const data = await apiPost<{
        token: string
        role: string
        isAdmin: boolean
        username: string
        id: string
        email: string
      }>('/api/auth/login', {
        email,
        password,
        rememberMe
      })

      localStorage.setItem("auth_token", data.token)
      localStorage.setItem("user_role", data.role || "user")
      localStorage.setItem("is_admin", data.isAdmin ? "true" : "false")
      if (data.username) {
        localStorage.setItem("username", data.username)
      } else {
        localStorage.removeItem("username")
      }
      // Store the complete user object for authorization checks
      const userObject = {
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role || "user",
        isAdmin: data.isAdmin || false
      }
      localStorage.setItem("user", JSON.stringify(userObject))
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "An error occurred. Please try again.")
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) setError("")
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) setError("")
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
      <DotGrid />

      <div className="relative z-10 w-full max-w-md px-4">
        <GlassCard>
          <GlassCardHeader className="text-center">
            <GlassCardTitle className="text-2xl font-bold text-[#8A2BE2]">Welcome Back</GlassCardTitle>
            <GlassCardDescription className="text-[#EAEAEA]/70">
              Sign in to your SecureVault account
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email
                </Label>
                <GlassInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
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
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-md p-2">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm text-[#EAEAEA]/70">
                  Remember me
                </Label>
              </div>

              <GlassButton type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </GlassButton>
            </form>

            <div className="mt-6 text-center space-y-2">
              <Link
                href="/forgot-password"
                className="text-sm text-[#DA70D6] hover:text-[#DA70D6]/80 transition-colors"
              >
                Forgot your password?
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
