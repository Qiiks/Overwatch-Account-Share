"use client"

import { useEffect, useState, useCallback } from "react"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"
import { GlassButton } from "@/components/ui/GlassButton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserActions } from "./UserActions"
import { CreateUserModal } from "./CreateUserModal"
import { Plus, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPatch, apiDelete } from "@/lib/api"

interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  status: "active" | "suspended" | "pending"
  lastLogin: string
  credentialCount?: number
  accountsOwned?: number
  flaggedCount?: number
  joinDate?: string
}

interface UserManagementProps {
  onUsersChange?: () => void
}

export function UserManagement({ onUsersChange }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user ID from localStorage
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUserId(user.id)
      } catch (error) {
        console.error("Failed to parse user data:", error)
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const fetchUsers = async () => {
    try {
      const data = await apiGet<any[]>('/api/admin/users')
      
      // Debug: Log raw API response
      console.log('[DEBUG] Raw API response for users:', data)
      
      // Map the data to ensure consistent structure
      const mappedUsers = data.map((user: any) => {
        // Debug: Log individual user data
        if (user.username === 'Qiikzx') {
          console.log('[DEBUG] Qiikzx user data from API:', user)
          console.log('[DEBUG] Qiikzx accountsOwned value:', user.accountsOwned)
        }
        
        return {
          id: user.id || user._id,
          username: user.username,
          email: user.email,
          role: user.role || (user.isAdmin ? "admin" : "user"),
          status: user.status || (user.isApproved ? "active" : "suspended"),
          lastLogin: user.lastLogin || "Never",
          credentialCount: user.credentialCount || user.accountsOwned || 0,
          accountsOwned: user.accountsOwned || 0,
          flaggedCount: user.flaggedCount || 0,
          joinDate: user.joinDate || "N/A"
        }
      })
      
      console.log('[DEBUG] Mapped users:', mappedUsers)
      setUsers(mappedUsers)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserStatusChange = useCallback(async (userId: string, newStatus: "active" | "suspended") => {
    try {
      await apiPatch(`/api/admin/users/${userId}/status`, {
        status: newStatus
      })
      
      toast.success(`User ${newStatus === "active" ? "activated" : "suspended"} successfully`)
      fetchUsers() // Refresh the list
      onUsersChange?.() // Trigger parent data refresh
    } catch (error: any) {
      console.error("Failed to update user status:", error)
      toast.error(error.message || "Failed to update user status")
    }
  }, [onUsersChange])

  const handleUserRoleChange = useCallback(async (userId: string, newRole: "user" | "admin") => {
    try {
      await apiPatch(`/api/admin/users/${userId}/role`, {
        role: newRole
      })
      
      toast.success(`User role updated to ${newRole} successfully`)
      fetchUsers() // Refresh the list
      onUsersChange?.() // Trigger parent data refresh
    } catch (error: any) {
      console.error("Failed to update user role:", error)
      toast.error(error.message || "Failed to update user role")
    }
  }, [onUsersChange])

  const handleUserDelete = useCallback(async (userId: string) => {
    try {
      await apiDelete(`/api/admin/users/${userId}`)
      
      toast.success("User deleted successfully")
      fetchUsers() // Refresh the list
      onUsersChange?.() // Trigger parent data refresh
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      toast.error(error.message || "Failed to delete user")
    }
  }, [onUsersChange])

  const handleUserCreated = useCallback((newUser: User) => {
    // Add the new user to the list
    setUsers(prev => [...prev, newUser])
    setShowCreateModal(false)
    toast.success("User created successfully")
    onUsersChange?.() // Trigger parent data refresh
  }, [onUsersChange])

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

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DA70D6]"></div>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-[#8A2BE2]">User Management</GlassCardTitle>
            <GlassButton onClick={() => setShowCreateModal(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </GlassButton>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#EAEAEA]/50" />
              <Input
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA] placeholder:text-[#EAEAEA]/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#EAEAEA]/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 pl-10 bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]">
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
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">User</th>
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">Email</th>
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">Role</th>
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">Status</th>
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">Accounts</th>
                  <th className="text-left p-4 text-[#EAEAEA]/70 font-medium">Last Login</th>
                  <th className="text-right p-4 text-[#EAEAEA]/70 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-[#8A2BE2]">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-[#EAEAEA]">{user.username}</div>
                          {user.joinDate && (
                            <div className="text-xs text-[#EAEAEA]/50">Joined: {user.joinDate}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[#EAEAEA]/80">{user.email}</td>
                    <td className="p-4">
                      {user.role === "admin" ? (
                        <Badge variant="secondary" className="bg-[#DA70D6]/20 text-[#DA70D6]">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-[#8A2BE2]/20 text-[#8A2BE2]">
                          User
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="p-4 text-[#EAEAEA]/80">
                      {user.accountsOwned || 0}
                      {(user.flaggedCount ?? 0) > 0 ? (
                        <span className="ml-2 text-red-400">⚠️ {user.flaggedCount}</span>
                      ) : null}
                    </td>
                    <td className="p-4 text-[#EAEAEA]/60">{user.lastLogin}</td>
                    <td className="p-4 text-right">
                      <UserActions
                        user={user}
                        currentUserId={currentUserId}
                        onStatusChange={handleUserStatusChange}
                        onRoleChange={handleUserRoleChange}
                        onDelete={handleUserDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-[#EAEAEA]/50">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Create User Modal */}
      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  )
}