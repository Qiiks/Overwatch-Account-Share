"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { DotGrid } from "@/components/DotGrid"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { Badge } from "@/components/ui/badge"
import { AddAccountModal } from "@/components/modals/AddAccountModal"
import { ShareAccountModal } from "@/components/modals/ShareAccountModal"
import { ManageAccountModal } from "@/components/modals/ManageAccountModal"
import { AccountSettingsModal } from "@/components/modals/AccountSettingsModal"
import { GoogleAccountsManager } from "@/components/GoogleAccountsManager"
import { apiGet, clearStoredAuthSession, getStoredAuthSession } from "@/lib/api"

interface Credential {
  id: string
  name: string
  type: "password" | "otp" | "api_key"
  lastUsed: string
  isShared: boolean
  sharedWith: { id: string; email: string; }[]
  owner: string
}

interface OnlineUser {
  id: string
  username: string
  status: "online" | "away" | "busy"
}

export default function DashboardPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [sharedCredentials, setSharedCredentials] = useState<Credential[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [onlineUsersCount, setOnlineUsersCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const socketRef = useRef<any>(null) // Changed to any temporarily

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)

  useEffect(() => {
    const { token, expired } = getStoredAuthSession()
    if (!token || expired) {
      if (expired) {
        clearStoredAuthSession()
      }
      router.push("/login")
      return
    }

    fetchDashboardData()

    // Validate NEXT_PUBLIC_API_BASE_URL is set for WebSocket connections
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required but not set');
    }
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  let pollOnlineUsers: ReturnType<typeof setInterval> | null = null

    // Try to load socket.io-client dynamically
    const initializeSocket = async () => {
      try {
        const io = (await import("socket.io-client")).io

        console.log("[WebSocket] Attempting to connect to:", apiBase)

        socketRef.current = io(apiBase, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        // Handle connection success
        socketRef.current.on('connect', () => {
          console.log('[WebSocket] Connected successfully, socket id:', socketRef.current?.id)
          // Request current online users count
          socketRef.current?.emit('requestOnlineUsers')
        })

        // Handle online users count updates
        socketRef.current.on('onlineUsers', (count: number) => {
          console.log('[WebSocket] Received online users count:', count)
          setOnlineUsersCount(count)
        })

        // Handle connection success with initial data
        socketRef.current.on('connectionSuccess', (data: { userId: string, onlineUsers: number }) => {
          console.log('[WebSocket] Connection success, initial data:', data)
          setOnlineUsersCount(data.onlineUsers)
        })

        // Handle connection errors
        socketRef.current.on('connect_error', (error: Error) => {
          console.error('[WebSocket] Connection error:', error.message)
        })

        // Handle disconnection
        socketRef.current.on('disconnect', (reason: string) => {
          console.log('[WebSocket] Disconnected:', reason)
        })
      } catch (error) {
        console.warn("[WebSocket] socket.io-client not available yet, falling back to polling")
        // Fallback: Poll for online users count every 5 seconds
        pollOnlineUsers = setInterval(async () => {
          try {
            const data = await apiGet('/api/dashboard/online-users')
            setOnlineUsersCount(data.count || 0)
          } catch (pollError) {
            console.error("[Polling] Failed to fetch online users:", pollError)
          }
        }, 5000)
      }
    }

    initializeSocket()

    // Cleanup function
    return () => {
      console.log('[WebSocket] Cleaning up socket connection')
      if (pollOnlineUsers) {
        clearInterval(pollOnlineUsers)
      }
      if (socketRef.current?.disconnect) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const data = await apiGet('/api/dashboard')
      const userId = data?.user?.id
      const isAdmin = !!data?.user?.isAdmin
      const username = data?.user?.username

      if (typeof window !== "undefined") {
        localStorage.setItem("is_admin", isAdmin ? "true" : "false")
        if (username) {
          localStorage.setItem("username", username)
        }
      }
      const accounts = Array.isArray(data?.accounts) ? data.accounts : []

      // Map backend accounts to UI Credential shape
      const mapped = accounts.map((acc: any, index: number) => ({
        id: acc.id || `credential-${index}-${Date.now()}`,
        name: acc.accountTag || acc.name || "",
        type: (acc.type as any) || "password",
        lastUsed: acc.updatedAt || acc.createdAt || "-",
        isShared: userId ? acc.owner_id !== userId : false,
        sharedWith: acc.sharedWith || [],
        owner: userId && acc.owner_id === userId ? "me" : acc.owner_id || "",
      })) as Credential[]

      setCredentials(mapped.filter(c => !c.isShared))
      setSharedCredentials(mapped.filter(c => c.isShared))
      setOnlineUsers([])
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      // Do not use mock data; leave lists empty on failure
      setCredentials([])
      setSharedCredentials([])
      setOnlineUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareCredential = (credential: Credential) => {
    setSelectedCredential(credential)
    setShowShareModal(true)
  }

  const handleManageCredential = (credential: Credential) => {
    setSelectedCredential(credential)
    setShowManageModal(true)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "password":
        return "🔑"
      case "otp":
        return "⏱️"
      case "api_key":
        return "🔐"
      default:
        return "📄"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "busy":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
        <DotGrid />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8A2BE2]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden">
      <Navigation />
      <DotGrid />

      <div className="relative z-10 container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-start md:items-center mb-8">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#8A2BE2] mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-[#EAEAEA]/70">Manage your credentials and OTPs securely</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto mt-4 md:mt-0">
            <GlassButton onClick={() => setShowAddModal(true)} variant="primary" className="w-full sm:w-auto">
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Credential</span>
            </GlassButton>
            <GlassButton onClick={() => setShowSettingsModal(true)} variant="ghost" className="w-full sm:w-auto">
              Settings
            </GlassButton>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <GlassCard>
            <GlassCardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#8A2BE2]">{credentials.length}</div>
              <div className="text-xs sm:text-sm text-[#EAEAEA]/70">Owned Credentials</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#DA70D6]">{sharedCredentials.length}</div>
              <div className="text-xs sm:text-sm text-[#EAEAEA]/70">Shared Access</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#8A2BE2]">{credentials.filter((c) => c.isShared).length}</div>
              <div className="text-xs sm:text-sm text-[#EAEAEA]/70">Shared by You</div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-[#DA70D6]">{onlineUsersCount}</div>
              <div className="text-xs sm:text-sm text-[#EAEAEA]/70">Online Users</div>
            </GlassCardContent>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Owned Credentials */}
          <div className="lg:col-span-2">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-[#8A2BE2]">Your Credentials</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-3">
                  {credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getTypeIcon(credential.type)}</div>
                        <div>
                          <div className="font-medium text-[#EAEAEA]">{credential.name}</div>
                          <div className="text-sm text-[#EAEAEA]/60">
                            {credential.type.replace("_", " ").toUpperCase()} • Last used {credential.lastUsed}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {credential.isShared && (
                          <Badge variant="secondary" className="bg-[#DA70D6]/20 text-[#DA70D6]">
                            Shared
                          </Badge>
                        )}
                        <GlassButton size="sm" variant="ghost" onClick={() => handleShareCredential(credential)}>
                          Share
                        </GlassButton>
                        <GlassButton size="sm" variant="ghost" onClick={() => handleManageCredential(credential)}>
                          Manage
                        </GlassButton>
                      </div>
                    </div>
                  ))}
                  {credentials.length === 0 && (
                    <div className="text-center py-8 text-[#EAEAEA]/50">
                      No credentials yet. Add your first credential to get started.
                    </div>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Shared Access */}
            {sharedCredentials.length > 0 && (
              <GlassCard className="mt-6">
                <GlassCardHeader>
                  <GlassCardTitle className="text-[#DA70D6]">Shared with You</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="space-y-3">
                    {sharedCredentials.map((credential) => (
                      <div
                        key={credential.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{getTypeIcon(credential.type)}</div>
                          <div>
                            <div className="font-medium text-[#EAEAEA]">{credential.name}</div>
                            <div className="text-sm text-[#EAEAEA]/60">
                              Shared by {credential.owner} • Last used {credential.lastUsed}
                            </div>
                          </div>
                        </div>
                        <GlassButton size="sm" variant="ghost">
                          Access
                        </GlassButton>
                      </div>
                    ))}
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}
          </div>

          {/* Online Users */}
          <div>
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-[#8A2BE2]">Online Users</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-3">
                  {onlineUsersCount > 0 ? (
                    <div className="text-center py-4">
                      <div className="text-3xl font-bold text-[#8A2BE2] mb-2">{onlineUsersCount}</div>
                      <div className="text-sm text-[#EAEAEA]/60">
                        {onlineUsersCount === 1 ? 'User Online' : 'Users Online'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#EAEAEA]/50">
                      No users online
                    </div>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>

        {/* Google Accounts Manager */}
        <div className="mt-8">
          <GoogleAccountsManager />
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <ShareAccountModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        credential={selectedCredential}
        onActionSuccess={fetchDashboardData}
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
