"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const signedIn = !!user;
  const links = signedIn
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/accounts", label: "Accounts" },
        ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/terms", label: "Terms" },
        { href: "/privacy", label: "Privacy" },
      ];

  // Close the sheet on route change, outside click and Escape.
  useEffect(() => setIsMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const actions = (
    <>
      {signedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className="h-9 border border-transparent px-3 text-sm text-ink-2 transition-colors duration-[var(--dur-2)] ease-standard hover:border-alarm/40 hover:text-alarm"
        >
          Log out
        </button>
      ) : (
        <>
          <Link
            href="/login"
            className={cn(
              "border px-3 py-2 text-sm transition-colors duration-[var(--dur-2)] ease-standard",
              pathname === "/login"
                ? "border-line-2 bg-white/3 text-ink"
                : "border-transparent text-ink-2 hover:border-line-2 hover:text-ink",
            )}
          >
            Log in
          </Link>
          {settings?.allow_registration && (
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg border border-signal bg-signal px-4 text-sm font-semibold text-signal-ink transition-colors duration-[var(--dur-2)] ease-standard hover:border-accent hover:bg-accent"
            >
              Create account
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <header ref={headerRef} className="border-b border-line">
      <div className="flex items-center gap-4 px-[var(--pad-x)] py-3">
        {/* Lime marks a live session; neutral when anonymous. */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "size-[7px] shrink-0",
              signedIn ? "bg-signal motion-safe:animate-led" : "bg-ink-3",
            )}
            aria-hidden="true"
          />
          <span className="text-base font-bold tracking-[0.1em] uppercase whitespace-nowrap">
            Overwatch Share
          </span>
          {user && (
            <span className="hidden font-mono text-2xs tracking-[0.06em] text-ink-3 uppercase truncate sm:inline">
              @{user.username}
            </span>
          )}
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "border px-3 py-2 text-sm transition-colors duration-[var(--dur-2)] ease-standard",
                pathname === link.href
                  ? "border-line-2 bg-white/3 text-ink"
                  : "border-transparent text-ink-2 hover:border-line-2 hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2.5 border-l border-line pl-3 md:flex">
          {actions}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="ml-auto flex size-11 items-center justify-center border border-line-2 text-ink-2 transition-colors md:hidden"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-line md:hidden">
          <nav className="flex flex-col py-1" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-l-2 px-4 text-base transition-colors",
                  pathname === link.href
                    ? "border-signal bg-signal/6 text-ink"
                    : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            {signedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-11 border border-line-2 px-4 text-sm text-ink-2 transition-colors hover:border-alarm/40 hover:text-alarm"
              >
                Log out
              </button>
            ) : (
              actions
            )}
          </div>
        </div>
      )}
    </header>
  );
}
