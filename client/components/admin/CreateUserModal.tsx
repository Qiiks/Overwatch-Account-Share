"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { apiPost } from "@/lib/api"

interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  status: "active" | "suspended" | "pending"
  lastLogin: string
  accountsOwned?: number
  joinDate?: string
}

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
  onUserCreated: (user: User) => void
}

export function CreateUserModal({ open, onClose, onUserCreated }: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const data = await apiPost<{ user: any; message: string }>('/api/admin/users', formData)
      
      // Create a user object that matches the expected format
      const newUser: User = {
        id: data.user?.id || data.user?._id || "",
        username: data.user?.username || formData.username,
        email: data.user?.email || formData.email,
        role: data.user?.role === "admin" ? "admin" : "user",
        status: data.user?.status || "active",
        lastLogin: data.user?.lastLogin || "Never",
        accountsOwned: data.user?.accountsOwned || 0,
        joinDate: data.user?.joinDate || new Date().toLocaleDateString(),
      }

      onUserCreated(newUser)
      toast.success(data.message || "User created successfully")
      
      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "user",
      })
      setErrors({})
      onClose()
    } catch (error: any) {
      console.error("Failed to create user:", error)
      const errorMessage = error.message || "Failed to create user"
      toast.error(errorMessage)
      
      // Handle specific field errors
      if (errorMessage.includes("email")) {
        setErrors({ email: errorMessage })
      } else if (errorMessage.includes("username")) {
        setErrors({ username: errorMessage })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "user",
      })
      setErrors({})
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#DA70D6]">Create New User</DialogTitle>
          <DialogDescription className="text-[#EAEAEA]/70">
            Create a new user account. They will be able to log in immediately.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#EAEAEA]">
                Username
              </Label>
              <GlassInput
                id="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value })
                  if (errors.username) {
                    setErrors({ ...errors, username: "" })
                  }
                }}
                className={errors.username ? "border-red-500/50" : ""}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-xs text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#EAEAEA]">
                Email
              </Label>
              <GlassInput
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) {
                    setErrors({ ...errors, email: "" })
                  }
                }}
                className={errors.email ? "border-red-500/50" : ""}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#EAEAEA]">
                Password
              </Label>
              <div className="relative">
                <GlassInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (errors.password) {
                      setErrors({ ...errors, password: "" })
                    }
                  }}
                  className={errors.password ? "border-red-500/50 pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#EAEAEA]/50 hover:text-[#EAEAEA]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-[#EAEAEA]">
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111]/95 backdrop-blur-md border-white/10">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <GlassButton
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </GlassButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}