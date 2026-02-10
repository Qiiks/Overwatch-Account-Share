"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GlassButton } from "@/components/ui/GlassButton";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { clearStoredAuthSession, getStoredAuthSession } from "@/lib/api";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    const { token, expired } = getStoredAuthSession();

    if (expired) {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setUsername("");
      return;
    }

    const adminStatus =
      typeof window !== "undefined" ? localStorage.getItem("is_admin") : null;
    const storedUsername =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;

    setIsLoggedIn(!!token);
    setIsAdmin(adminStatus === "true");
    setUsername(storedUsername || "");
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearStoredAuthSession();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUsername("");
    router.push("/login");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#8A2BE2]/15"
      ref={menuRef}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-xl md:text-2xl font-bold font-heading text-[#8A2BE2] tracking-tight">
              SecureVault
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {!isLoggedIn ? (
              <>
                <Link href="/">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Home
                  </GlassButton>
                </Link>
                <Link href="/terms">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/terms")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Terms
                  </GlassButton>
                </Link>
                <Link href="/privacy">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/privacy")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Privacy
                  </GlassButton>
                </Link>
                <Link href="/login">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/login")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Login
                  </GlassButton>
                </Link>
                {settings?.allow_registration && (
                  <Link href="/register">
                    <GlassButton variant="primary">Register</GlassButton>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/dashboard">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/dashboard")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Dashboard
                  </GlassButton>
                </Link>

                <Link href="/accounts">
                  <GlassButton
                    variant="ghost"
                    className={`${
                      isActive("/accounts")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Accounts
                  </GlassButton>
                </Link>

                {isAdmin && (
                  <Link href="/admin">
                    <GlassButton
                      variant="ghost"
                      className={`text-green-400 hover:text-green-300 hover:bg-green-400/10 ${
                        isActive("/admin")
                          ? "text-green-300 bg-green-400/10 border-green-400/30"
                          : ""
                      }`}
                    >
                      Admin
                    </GlassButton>
                  </Link>
                )}

                <div className="flex items-center space-x-3 ml-2">
                  {username && (
                    <span className="text-[#EAEAEA]/60 text-sm">
                      {username}
                    </span>
                  )}
                  <GlassButton
                    onClick={handleLogout}
                    variant="ghost"
                    className="border-red-400/50 text-red-400 hover:bg-red-400/10 bg-transparent"
                  >
                    Logout
                  </GlassButton>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-[#DA70D6] hover:text-[#8A2BE2] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-[#8A2BE2]/15 pt-4">
            {!isLoggedIn ? (
              <>
                <Link href="/" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Home
                  </GlassButton>
                </Link>
                <Link href="/terms" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/terms")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Terms
                  </GlassButton>
                </Link>
                <Link href="/privacy" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/privacy")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Privacy
                  </GlassButton>
                </Link>
                <Link href="/login" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/login")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Login
                  </GlassButton>
                </Link>
                {settings?.allow_registration && (
                  <Link href="/register" className="block">
                    <GlassButton variant="primary" className="w-full">
                      Register
                    </GlassButton>
                  </Link>
                )}
              </>
            ) : (
              <>
                {username && (
                  <div className="px-3 py-2 text-[#EAEAEA]/60 text-sm border-b border-[#8A2BE2]/10">
                    {username}
                  </div>
                )}
                <Link href="/dashboard" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/dashboard")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Dashboard
                  </GlassButton>
                </Link>
                <Link href="/accounts" className="block">
                  <GlassButton
                    variant="ghost"
                    className={`w-full text-left ${
                      isActive("/accounts")
                        ? "text-[#DA70D6] bg-[#8A2BE2]/10 border-[#8A2BE2]/30"
                        : ""
                    }`}
                  >
                    Accounts
                  </GlassButton>
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="block">
                    <GlassButton
                      variant="ghost"
                      className={`w-full text-left text-green-400 hover:text-green-300 hover:bg-green-400/10 ${
                        isActive("/admin")
                          ? "text-green-300 bg-green-400/10 border-green-400/30"
                          : ""
                      }`}
                    >
                      Admin
                    </GlassButton>
                  </Link>
                )}
                <GlassButton
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full text-left border-red-400/50 text-red-400 hover:bg-red-400/10 bg-transparent"
                >
                  Logout
                </GlassButton>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
