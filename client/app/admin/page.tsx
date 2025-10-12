"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { DotGrid } from "@/components/DotGrid"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { RegistrationToggle } from "@/components/admin/RegistrationToggle"
import { UserManagement } from "@/components/admin/UserManagement"
import { apiGet } from "@/lib/api"

interface AdminStats {
  totalUsers: number
  activeUsers: number
  flaggedActivities: number
  totalCredentials: number
  sharedCredentials: number
  systemHealth: "healthy" | "warning" | "critical"
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const isAdmin = localStorage.getItem("is_admin") === "true"

    if (!token || !isAdmin) {
      router.push("/dashboard")
      return
    }

    fetchAdminData()
  }, [router])

  const fetchAdminData = async () => {
    try {
      const data = await apiGet<{ stats: AdminStats }>('/api/admin/dashboard')
      setStats(data.stats)
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
      // No mock data; leave empty on failure
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = async (action: string) => {
    try {
      let endpoint = ""

      if (action === "security-audit") {
        endpoint = "/api/admin/logs"
      } else if (action === "database-backup") {
        endpoint = "/api/admin/stats"
      } else {
        alert(`Action '${action}' is not supported`)
        return
      }

      await apiGet(endpoint)
      alert(`${action} completed successfully`)
    } catch (error) {
      console.error(`${action} error:`, error)
      alert(`Failed to execute ${action}`)
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-green-400"
      case "warning":
        return "text-yellow-400"
      case "critical":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden flex items-center justify-center">
        <DotGrid />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DA70D6]"></div>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#DA70D6] mb-2">Admin Panel</h1>
            <p className="text-[#EAEAEA]/70">System administration and user management</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <GlassButton onClick={() => handleQuickAction("security-audit")} variant="warning">
              Security Audit
            </GlassButton>
            <GlassButton onClick={() => handleQuickAction("database-backup")} variant="success">
              Backup Database
            </GlassButton>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="text-2xl font-bold text-[#DA70D6]">{stats.totalUsers}</div>
                <div className="text-sm text-[#EAEAEA]/70">Total Users</div>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
                <div className="text-sm text-[#EAEAEA]/70">Active Users</div>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="text-2xl font-bold text-red-400">{stats.flaggedActivities}</div>
                <div className="text-sm text-[#EAEAEA]/70">Flagged Activities</div>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="text-2xl font-bold text-[#8A2BE2]">{stats.totalCredentials}</div>
                <div className="text-sm text-[#EAEAEA]/70">Total Credentials</div>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="text-2xl font-bold text-[#DA70D6]">{stats.sharedCredentials}</div>
                <div className="text-sm text-[#EAEAEA]/70">Shared Credentials</div>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className={`text-2xl font-bold ${getHealthColor(stats.systemHealth)}`}>
                  {stats.systemHealth.toUpperCase()}
                </div>
                <div className="text-sm text-[#EAEAEA]/70">System Health</div>
              </GlassCardContent>
            </GlassCard>
          </div>
        )}

        {/* Quick Actions */}
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-[#DA70D6]">Quick Actions</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassButton
                onClick={() => handleQuickAction("system-settings")}
                variant="ghost"
                className="h-16 flex-col"
              >
                <div className="text-2xl mb-1">⚙️</div>
                <div>System Settings</div>
              </GlassButton>
              <GlassButton
                onClick={() => handleQuickAction("security-audit")}
                variant="ghost"
                className="h-16 flex-col"
              >
                <div className="text-2xl mb-1">🔍</div>
                <div>Security Audit</div>
              </GlassButton>
              <GlassButton
                onClick={() => handleQuickAction("database-backup")}
                variant="ghost"
                className="h-16 flex-col"
              >
                <div className="text-2xl mb-1">💾</div>
                <div>Database Backup</div>
              </GlassButton>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Application Settings */}
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-[#DA70D6]">Application Settings</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-6">
              <RegistrationToggle />
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* User Management */}
        <UserManagement onUsersChange={fetchAdminData} />
      </div>
    </div>
  )
}
