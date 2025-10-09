"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { GlassButton } from "@/components/ui/GlassButton"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const adminStatus = localStorage.getItem("is_admin")
    const storedUsername = localStorage.getItem("username")

    setIsLoggedIn(!!token)
    setIsAdmin(adminStatus === "true")
    setUsername(storedUsername || "")
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_role")
    localStorage.removeItem("is_admin")
    localStorage.removeItem("username")
    setIsLoggedIn(false)
    setIsAdmin(false)
    setUsername("")
    router.push("/")
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-cyan-400/20" ref={menuRef}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-xl md:text-2xl font-bold font-mono text-cyan-400 animate-neon-flicker">&gt; SECUREVAULT_</div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoggedIn ? (
              <>
                <Link href="/">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    HOME
                  </GlassButton>
                </Link>
                <Link href="/terms">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/terms" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    TERMS
                  </GlassButton>
                </Link>
                <Link href="/privacy">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/privacy" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    PRIVACY
                  </GlassButton>
                </Link>
                <Link href="/login">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/login" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    LOGIN
                  </GlassButton>
                </Link>
                <Link href="/register">
                  <GlassButton className="font-mono">REGISTER</GlassButton>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/dashboard" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    DASHBOARD
                  </GlassButton>
                </Link>

                <Link href="/accounts">
                  <GlassButton
                    variant="ghost"
                    className={`text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/accounts" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    ACCOUNTS
                  </GlassButton>
                </Link>

                {isAdmin && (
                  <Link href="/admin">
                    <GlassButton
                      variant="ghost"
                      className={`text-green-400 hover:text-green-300 hover:bg-green-400/10 font-mono ${
                        pathname === "/admin" ? "text-green-300 bg-green-400/10" : ""
                      }`}
                    >
                      ADMIN
                    </GlassButton>
                  </Link>
                )}

                <div className="flex items-center space-x-3">
                  {username && (
                    <span className="text-cyan-400/70 text-sm font-mono">USER: {username.toUpperCase()}</span>
                  )}
                  <GlassButton
                    onClick={handleLogout}
                    variant="ghost"
                    className="border-red-400/50 text-red-400 hover:bg-red-400/10 bg-transparent font-mono"
                  >
                    LOGOUT
                  </GlassButton>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-cyan-400/20 pt-4">
            {!isLoggedIn ? (
              <>
                <Link href="/" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    HOME
                  </GlassButton>
                </Link>
                <Link href="/terms" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/terms" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    TERMS
                  </GlassButton>
                </Link>
                <Link href="/privacy" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/privacy" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    PRIVACY
                  </GlassButton>
                </Link>
                <Link href="/login" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/login" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    LOGIN
                  </GlassButton>
                </Link>
                <Link href="/register" className="block">
                  <GlassButton className="w-full font-mono">REGISTER</GlassButton>
                </Link>
              </>
            ) : (
              <>
                {username && (
                  <div className="px-3 py-2 text-cyan-400/70 text-sm font-mono border-b border-cyan-400/10">
                    USER: {username.toUpperCase()}
                  </div>
                )}
                <Link href="/dashboard" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/dashboard" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    DASHBOARD
                  </GlassButton>
                </Link>
                <Link href="/accounts" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono ${
                      pathname === "/accounts" ? "text-cyan-300 bg-cyan-400/10" : ""
                    }`}
                  >
                    ACCOUNTS
                  </GlassButton>
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="block">
                    <GlassButton
                      variant="ghost"
                      className={`w-full text-left text-green-400 hover:text-green-300 hover:bg-green-400/10 font-mono ${
                        pathname === "/admin" ? "text-green-300 bg-green-400/10" : ""
                      }`}
                    >
                      ADMIN
                    </GlassButton>
                  </Link>
                )}
                <GlassButton
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full text-left border-red-400/50 text-red-400 hover:bg-red-400/10 bg-transparent font-mono"
                >
                  LOGOUT
                </GlassButton>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
