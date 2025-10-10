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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      if (response.ok) {
        const data = await response.json()
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
      } else {
        // Handle error
        console.error("Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

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
