"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GlassButton } from "@/components/ui/GlassButton"
import { AddAccountModal } from "@/components/modals/AddAccountModal"
import { ShareAccountDialog } from "@/components/ShareAccountDialog"
import { ManageAccountModal } from "@/components/modals/ManageAccountModal"
import { AccountSettingsModal } from "@/components/modals/AccountSettingsModal"
import { GoogleAccountsManager } from "@/components/GoogleAccountsManager"
import { apiGet } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { connectSocket } from "@/lib/socket"
import { useAuth } from "@/context/AuthContext"

interface SharedUser {
  id: string
  email: string
}

interface Credential {
  id: string
  name: string
  type: "password" | "otp" | "api_key"
  lastUsed: string
  isShared: boolean
  sharedWith: SharedUser[]
  owner: string
}

interface DashboardAccount {
  id?: string
  accountTag?: string
  name?: string
  type?: string
  updatedAt?: string
  createdAt?: string
  owner_id?: string
  sharedWith?: SharedUser[]
  owner?: { username?: string } | null
}

interface DashboardPayload {
  user?: { id: string }
  accounts?: DashboardAccount[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [sharedCredentials, setSharedCredentials] = useState<Credential[]>([])
  const [onlineUsersCount, setOnlineUsersCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await apiGet<DashboardPayload>('/api/dashboard')
      const userId = data?.user?.id
      const accounts = Array.isArray(data?.accounts) ? data.accounts : []

      // Map backend accounts to UI Credential shape
      const mapped = accounts.map((acc, index) => ({
        id: acc.id || `credential-${index}`,
        name: acc.accountTag || acc.name || "",
        type: (acc.type as Credential["type"]) || "password",
        lastUsed: acc.updatedAt || acc.createdAt || "-",
        isShared: userId ? acc.owner_id !== userId : false,
        sharedWith: acc.sharedWith || [],
        owner:
          acc.owner?.username ||
          (userId && acc.owner_id === userId ? "me" : "another user"),
      })) as Credential[]

      setCredentials(mapped.filter(c => !c.isShared))
      setSharedCredentials(mapped.filter(c => c.isShared))
    } catch (error) {
      toast.error(errorMessage(error, "Failed to fetch dashboard data"))
      setCredentials([])
      setSharedCredentials([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace("/login")
      return
    }

    void fetchDashboardData()

    const socket = connectSocket()
    socket.on("connect", () => {
      socket.emit("requestOnlineUsers")
    })
    socket.on("onlineUsers", (count: number) => setOnlineUsersCount(count))
    socket.on("connectionSuccess", (data: { onlineUsers: number }) =>
      setOnlineUsersCount(data.onlineUsers),
    )

    return () => {
      socket.off("onlineUsers")
      socket.off("connectionSuccess")
      socket.disconnect()
    }
  }, [authLoading, user, router, fetchDashboardData])

  const handleShareCredential = (credential: Credential) => {
    setSelectedCredential(credential)
    setShowShareModal(true)
  }

  const handleManageCredential = (credential: Credential) => {
    setSelectedCredential(credential)
    setShowManageModal(true)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase animate-led motion-reduce:animate-none">
          Connecting…
        </span>
      </div>
    )
  }

  const sharedByMe = credentials.filter((c) => c.sharedWith.length > 0).length

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
        <h1 className="text-md font-semibold text-ink">Dashboard</h1>
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
          Operator console
        </span>
        <div className="ml-auto flex items-center gap-2">
          <GlassButton
            onClick={() => setShowAddModal(true)}
            variant="primary"
            size="sm"
          >
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add credential</span>
          </GlassButton>
          <GlassButton onClick={() => setShowSettingsModal(true)} variant="ghost" size="sm">
            Settings
          </GlassButton>
        </div>
      </header>

      {/* Readout strip */}
      <div className="flex flex-wrap border-b border-line">
        <Readout label="Owned" value={credentials.length} />
        <Readout label="Shared with you" value={sharedCredentials.length} />
        <Readout label="Shared by you" value={sharedByMe} />
        <Readout label="Online now" value={onlineUsersCount} live={onlineUsersCount > 0} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.62fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-panel">
            <PanelHead title="Your credentials" meta={`${credentials.length} in vault`} />
            {credentials.length === 0 ? (
              <p className="px-3.5 py-10 text-center font-mono text-xs text-ink-3">
                No credentials yet. Add your first credential to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Credential</Th>
                      <Th className="hidden md:table-cell">Shared with</Th>
                      <Th className="hidden sm:table-cell">Last used</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {credentials.map((credential) => (
                      <tr
                        key={credential.id}
                        className="transition-colors duration-150 ease-standard hover:bg-white/[0.025]"
                      >
                        <td className="border-t border-line px-3.5 py-2.5 align-middle">
                          <span className="font-mono text-sm font-medium text-ink">
                            {credential.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
                            {credential.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs text-ink-2 md:table-cell">
                          {credential.sharedWith.length > 0
                            ? credential.sharedWith
                                .map((u) => u.email.split("@")[0])
                                .join(", ")
                            : "—"}
                        </td>
                        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs tabular-nums text-ink-2 sm:table-cell">
                          {credential.lastUsed}
                        </td>
                        <td className="border-t border-line px-3.5 py-2.5 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <GlassButton
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShareCredential(credential)}
                            >
                              Share
                            </GlassButton>
                            <GlassButton
                              size="sm"
                              variant="ghost"
                              onClick={() => handleManageCredential(credential)}
                            >
                              Manage
                            </GlassButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {sharedCredentials.length > 0 && (
            <section className="rounded-lg border border-line bg-panel">
              <PanelHead
                title="Shared with you"
                meta={`${sharedCredentials.length} accounts`}
              />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Credential</Th>
                      <Th className="hidden sm:table-cell">Owner</Th>
                      <Th className="hidden sm:table-cell">Last used</Th>
                      <Th className="text-right">Access</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedCredentials.map((credential) => (
                      <tr
                        key={credential.id}
                        className="transition-colors duration-150 ease-standard hover:bg-white/[0.025]"
                      >
                        <td className="border-t border-line px-3.5 py-2.5 align-middle">
                          <span className="font-mono text-sm font-medium text-ink">
                            {credential.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
                            {credential.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs text-ink-2 sm:table-cell">
                          {credential.owner}
                        </td>
                        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs tabular-nums text-ink-2 sm:table-cell">
                          {credential.lastUsed}
                        </td>
                        <td className="border-t border-line px-3.5 py-2.5 text-right align-middle">
                          <span className="rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ink-2 uppercase">
                            Shared
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-panel">
            <PanelHead title="Relay · online" live={onlineUsersCount > 0} />
            <div className="px-3.5 py-4">
              <p
                className={`font-mono text-2xl tabular-nums ${
                  onlineUsersCount > 0 ? "text-signal" : "text-ink"
                }`}
              >
                {onlineUsersCount}
              </p>
              <p className="mt-1 font-mono text-2xs tracking-label text-ink-3 uppercase">
                {onlineUsersCount === 1 ? "User online" : "Users online"}
              </p>
              <p className="mt-3 border-t border-line pt-3 font-mono text-2xs text-ink-3">
                {onlineUsersCount > 0
                  ? "Live socket session · codes push to owners and shared users"
                  : "No users online"}
              </p>
            </div>
          </section>

          <GoogleAccountsManager />
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchDashboardData}
      />
      <ShareAccountDialog
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        accountId={selectedCredential?.id || ""}
        accountTag={selectedCredential?.name || ""}
        sharedWith={selectedCredential?.sharedWith}
        onShareSuccess={fetchDashboardData}
      />
      <ManageAccountModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        credential={selectedCredential}
        onActionSuccess={fetchDashboardData}
      />
      <AccountSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  )
}

function PanelHead({
  title,
  meta,
  live = false,
}: {
  title: string
  meta?: string
  live?: boolean
}) {
  return (
    <header className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
      {live && <span className="size-1.5 flex-none bg-signal animate-led motion-reduce:animate-none" />}
      <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">{title}</h2>
      {meta && <span className="font-mono text-2xs text-ink-3">{meta}</span>}
    </header>
  )
}

function Readout({
  label,
  value,
  live = false,
}: {
  label: string
  value: number
  live?: boolean
}) {
  return (
    <div className="mr-5 border-r border-line py-3 pr-5 last:mr-0 last:border-r-0">
      <p
        className={`font-mono text-xl tabular-nums ${live ? "text-signal" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="font-mono text-2xs tracking-label text-ink-3 uppercase">{label}</p>
    </div>
  )
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase ${className}`}
    >
      {children}
    </th>
  )
}
