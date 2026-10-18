"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AccountsList } from "@/components/AccountsList"
import { useAuth } from "@/context/AuthContext"

/**
 * The roster is behind the same client guard as the dashboard. Without it an anonymous visitor
 * rendered the ledger shell (the fetch behind it 401s, so no data leaked, but the page should
 * not exist for them) while the suite's guard assertion expected a redirect.
 */
export default function AccountsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase animate-led motion-reduce:animate-none">
          Checking session
        </span>
      </div>
    )
  }

  return <AccountsList />
}
