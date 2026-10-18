"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { useAuth } from "@/context/AuthContext"
import { useSettings } from "@/context/SettingsContext"
import { errorMessage } from "@/lib/errors"

const LABEL = "font-mono text-2xs tracking-label text-ink-3 uppercase"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { settings } = useSettings()
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
      await login(email, password, rememberMe)
      router.push("/dashboard")
    } catch (error) {
      setError(errorMessage(error, "An error occurred. Please try again."))
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
    <div className="mx-auto my-auto w-full max-w-[26rem] py-10">
      <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
        <span className="size-[7px] bg-ink-3" aria-hidden="true" />
        <span className="text-sm font-bold tracking-[0.1em] uppercase">
          Overwatch Share
        </span>
      </Link>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-xl">Sign in</GlassCardTitle>
          <GlassCardDescription>
            Reach the accounts shared with you, and the login codes that follow.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={LABEL}>
                Email
              </Label>
              <GlassInput
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={LABEL}>
                Password
              </Label>
              <GlassInput
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-alarm/40 bg-alarm/10 px-3 py-2 text-sm text-alarm"
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm text-ink-2">
                Remember me
              </Label>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </GlassButton>
          </form>

          {settings?.allow_registration && (
            <p className="mt-5 border-t border-line pt-4 text-sm text-ink-2">
              No account yet?{" "}
              <Link href="/register" className="text-signal hover:text-accent">
                Create one
              </Link>
            </p>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
