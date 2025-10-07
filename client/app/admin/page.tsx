"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { DotGrid } from "@/components/DotGrid"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AdminStats {
  totalUsers: number
  activeUsers: number
  flaggedActivities: number
  totalCredentials: number
  sharedCredentials: number
  systemHealth: "healthy" | "warning" | "critical"
}

interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  status: "active" | "suspended" | "pending"
  lastLogin: string
  credentialCount: number
  flaggedCount: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionType, setActionType] = useState<"suspend" | "activate" | "delete" | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const isAdmin = localStorage.getItem("is_admin") === "true"

    if (!token || !isAdmin) {
      router.push("/dashboard")
      return
    }

    fetchAdminData()
  }, [router])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const fetchAdminData = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`${apiBase}/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setUsers(data.users)
      } else {
        // No mock data; leave empty on failure
        setStats(null)
        setUsers([])
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserAction = async (user: User, action: "suspend" | "activate" | "delete") => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action === "suspend" ? "suspended" : action === "activate" ? "active" : "deleted" }),
      })

      if (response.ok) {
        // Refresh data
        fetchAdminData()
      } else {
        alert(`Failed to ${action} user`)
      }
    } catch (error) {
      console.error(`${action} user error:`, error)
      alert(`Failed to ${action} user`)
    }
    setSelectedUser(null)
    setActionType(null)
  }

  const handleQuickAction = async (action: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const token = localStorage.getItem("auth_token")
      let url = ""
      let method: "GET" | "POST" = "GET"

      if (action === "security-audit") {
        url = `${apiBase}/api/admin/logs`
        method = "GET"
      } else if (action === "database-backup") {
        url = `${apiBase}/api/admin/stats`
        method = "GET"
      } else {
        alert(`Action '${action}' is not supported`)
        return
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        alert(`${action} completed successfully`)
      } else {
        alert(`Failed to execute ${action}`)
      }
    } catch (error) {
      console.error(`${action} error:`, error)
      alert(`Failed to execute ${action}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "suspended":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
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

        {/* User Management */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-[#8A2BE2]">User Management</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search users by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA] placeholder:text-[#EAEAEA]/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111]/95 backdrop-blur-md border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-[#8A2BE2]">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-[#EAEAEA]">{user.username}</span>
                        {user.role === "admin" && (
                          <Badge variant="secondary" className="bg-[#DA70D6]/20 text-[#DA70D6]">
                            Admin
                          </Badge>
                        )}
                        <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                      </div>
                      <div className="text-sm text-[#EAEAEA]/60">
                        {user.email} • {user.credentialCount} credentials • Last login: {user.lastLogin}
                      </div>
                      {user.flaggedCount > 0 && (
                        <div className="text-sm text-red-400">⚠️ {user.flaggedCount} flagged activities</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.status === "active" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <GlassButton
                            size="sm"
                            variant="warning"
                            onClick={() => {
                              setSelectedUser(user)
                              setActionType("suspend")
                            }}
                          >
                            Suspend
                          </GlassButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-yellow-400">Suspend User</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#EAEAEA]/70">
                              Are you sure you want to suspend {user.username}? They will lose access to their account
                              and all shared credentials.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-[#EAEAEA] hover:bg-white/10">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleUserAction(user, "suspend")}
                              className="bg-yellow-500/80 hover:bg-yellow-500 text-white"
                            >
                              Suspend
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : user.status === "suspended" ? (
                      <GlassButton size="sm" variant="success" onClick={() => handleUserAction(user, "activate")}>
                        Activate
                      </GlassButton>
                    ) : (
                      <GlassButton size="sm" variant="primary" onClick={() => handleUserAction(user, "activate")}>
                        Approve
                      </GlassButton>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <GlassButton
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUser(user)
                            setActionType("delete")
                          }}
                        >
                          Delete
                        </GlassButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-400">Delete User</AlertDialogTitle>
                          <AlertDialogDescription className="text-[#EAEAEA]/70">
                            Are you sure you want to permanently delete {user.username}? This action cannot be undone
                            and will delete all their credentials and shared access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10 text-[#EAEAEA] hover:bg-white/10">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUserAction(user, "delete")}
                            className="bg-red-500/80 hover:bg-red-500 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-[#EAEAEA]/50">No users found matching your criteria.</div>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
