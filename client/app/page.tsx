"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DotGrid } from "@/components/DotGrid"
import { Navigation } from "@/components/Navigation"
import { getStoredAuthSession } from "@/lib/api"

export default function IndexPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check authentication status
    const { token, expired } = getStoredAuthSession()
    if (expired) {
      setIsLoggedIn(false)
      setIsAdmin(false)
      return
    }

    const userRole = typeof window !== "undefined" ? localStorage.getItem("user_role") : null
    setIsLoggedIn(!!token)
    setIsAdmin(userRole === "admin")
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Navigation />
      <DotGrid />

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-16 pt-24">
        <div className="text-center mb-16">
          <h1 className="platform-title text-6xl md:text-8xl font-bold mb-6 font-mono tracking-wider animate-neon-flicker">
            SECUREVAULT
          </h1>
          <div className="terminal-text text-lg mb-2 opacity-60">&gt; INITIALIZING SECURE CONNECTION...</div>
          <p className="text-xl md:text-2xl text-cyan-400/80 mb-8 max-w-3xl mx-auto font-mono">
            QUANTUM-ENCRYPTED CREDENTIAL SHARING PROTOCOL
          </p>
          <div className="terminal-text text-sm mb-8 opacity-40">
            [SYSTEM STATUS: ONLINE] [ENCRYPTION: AES-256] [UPTIME: 99.99%]
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!isLoggedIn ? (
              <>
                <Button
                  onClick={() => router.push("/login")}
                  className="btn-glass px-8 py-3 text-lg font-mono"
                  size="lg"
                >
                  &gt; ACCESS_TERMINAL
                </Button>
                <Button
                  onClick={() => router.push("/register")}
                  variant="outline"
                  className="btn-glass px-8 py-3 text-lg border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 font-mono"
                  size="lg"
                >
                  &gt; NEW_USER_INIT
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="btn-glass px-8 py-3 text-lg font-mono"
                  size="lg"
                >
                  &gt; ENTER_MAINFRAME
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => router.push("/admin")}
                    variant="outline"
                    className="btn-glass px-8 py-3 text-lg border-green-400/50 text-green-400 hover:bg-green-400/10 font-mono"
                    size="lg"
                  >
                    &gt; ADMIN_CONSOLE
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Platform Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card className="glass-card holographic">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-xl font-mono">[SECURE_STORAGE]</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-cyan-400/70 font-mono text-sm">
                &gt; QUANTUM ENCRYPTION
                <br />
                &gt; ZERO-KNOWLEDGE ARCH
                <br />
                &gt; MILITARY-GRADE SEC
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card holographic">
            <CardHeader>
              <CardTitle className="text-green-400 text-xl font-mono">[TEAM_PROTOCOL]</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-green-400/70 font-mono text-sm">
                &gt; SECURE CHANNELS
                <br />
                &gt; MULTI-USER ACCESS
                <br />
                &gt; REAL-TIME SYNC
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card holographic">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-xl font-mono">[ACCESS_CONTROL]</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-cyan-400/70 font-mono text-sm">
                &gt; PERMISSION MATRIX
                <br />
                &gt; ROLE-BASED AUTH
                <br />
                &gt; AUDIT LOGGING
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card holographic">
            <CardHeader>
              <CardTitle className="text-green-400 text-xl font-mono">[OTP_GENERATOR]</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-green-400/70 font-mono text-sm">
                &gt; TOTP ALGORITHM
                <br />
                &gt; AUTO-REFRESH
                <br />
                &gt; INSTANT SHARE
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block bg-black/50 border border-cyan-400/30 rounded px-6 py-2 font-mono text-xs text-cyan-400/60">
            <span className="animate-pulse">●</span> SYSTEM_ONLINE |
            <span className="text-green-400"> SECURE_CONNECTION</span> | USERS_ACTIVE:{" "}
            <span className="text-cyan-400">1,337</span> | UPTIME: <span className="text-green-400">99.99%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
