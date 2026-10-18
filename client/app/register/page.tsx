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
import { useSettings } from "@/context/SettingsContext"
import { useAuth } from "@/context/AuthContext"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

const LABEL = "font-mono text-2xs tracking-label text-ink-3 uppercase"

/* Same contract the server enforces; shown live so the field is not a guessing game. */
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One digit", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "One special character: @ $ ! % * ? &",
    test: (value: string) => /[@$!%*?&]/.test(value),
  },
]

function validatePassword(password: string): string | null {
  const unmet = PASSWORD_RULES.find((rule) => !rule.test(password))
  return unmet ? `Password must have: ${unmet.label.toLowerCase()}.` : null
}

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
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
  const [notice, setNotice] = useState<string | null>(null)

  // No redirect when registration is closed: the dedicated card below states why and offers
  // the way to log in. A redirect on the same condition only flashed that card before leaving.

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "password") {
      setPasswordError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNotice(null)

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
      setPasswordError("Please accept the Terms of Service and Privacy Policy")
      return
    }

    setPasswordError(null)
    setIsLoading(true)

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })

      if (result.pendingApproval) {
        setNotice(
          "Your account was created and is waiting for administrator approval.",
        )
        return
      }

      router.push("/dashboard")
    } catch (error) {
      setPasswordError(
        errorMessage(error, "Registration failed. Please try again."),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while settings are being fetched
  if (loading) {
    return (
      <div className="mx-auto my-auto w-full max-w-[26rem] py-10">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="font-mono text-xs tracking-label text-ink-3 uppercase">
              Loading
            </GlassCardTitle>
          </GlassCardHeader>
        </GlassCard>
      </div>
    )
  }

  // Show registration closed message if registration is disabled
  if (settings && !settings.allow_registration) {
    return (
      <div className="mx-auto my-auto w-full max-w-[26rem] py-10">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-xl">
              Registration closed
            </GlassCardTitle>
            <GlassCardDescription>
              New user registration is currently disabled. Please contact an
              administrator.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <GlassButton
              variant="primary"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Back to log in
            </GlassButton>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
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
          <GlassCardTitle className="text-xl">Create account</GlassCardTitle>
          <GlassCardDescription>
            An administrator reviews new accounts before access is granted.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className={LABEL}>
                Username
              </Label>
              <GlassInput
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="nightrunner"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={LABEL}>
                Email
              </Label>
              <GlassInput
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
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
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                aria-describedby="password-rules"
              />
              <ul
                id="password-rules"
                className="mt-2 space-y-1 border border-line bg-panel-2 px-3 py-2"
              >
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(formData.password)
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-2 font-mono text-2xs tracking-[0.05em] uppercase",
                        met ? "text-ink" : "text-ink-3",
                      )}
                    >
                      <span
                        className={cn(
                          "size-[7px] shrink-0",
                          met ? "bg-signal" : "bg-ink-3",
                        )}
                        aria-hidden="true"
                      />
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={LABEL}>
                Confirm password
              </Label>
              <GlassInput
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm leading-relaxed text-ink-2"
                >
                  I accept the{" "}
                  <Link href="/terms" className="text-signal hover:text-accent">
                    Terms of Service
                  </Link>
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={acceptPrivacy}
                  onCheckedChange={(checked) =>
                    setAcceptPrivacy(checked as boolean)
                  }
                />
                <Label
                  htmlFor="privacy"
                  className="text-sm leading-relaxed text-ink-2"
                >
                  I accept the{" "}
                  <Link href="/privacy" className="text-signal hover:text-accent">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
            </div>

            {passwordError && (
              <p
                role="alert"
                className="rounded-md border border-alarm/40 bg-alarm/10 px-3 py-2 text-sm text-alarm"
              >
                {passwordError}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn"
              >
                {notice}
              </p>
            )}

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading || !acceptTerms || !acceptPrivacy}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </GlassButton>
          </form>

          <p className="mt-5 border-t border-line pt-4 text-sm text-ink-2">
            Already have an account?{" "}
            <Link href="/login" className="text-signal hover:text-accent">
              Sign in
            </Link>
          </p>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
