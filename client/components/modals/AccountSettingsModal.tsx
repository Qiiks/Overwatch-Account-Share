"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiPatch, apiPost } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { useAuth } from "@/context/AuthContext"

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, refresh } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      setFormData((prev) => ({ ...prev, username: user.username }))
    }
  }, [isOpen, user])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)

    try {
      await apiPatch("/auth/me", { username: formData.username })
      await refresh()
      toast.success("Profile updated")
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update profile"))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords don't match")
      return
    }

    setIsSavingPassword(true)

    try {
      await apiPost("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
      toast.success("Password changed")
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
      onClose()
    } catch (error) {
      toast.error(errorMessage(error, "Failed to change password"))
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
        <DialogHeader>
          <DialogTitle className="text-[#8A2BE2] text-xl">Account Settings</DialogTitle>
          <DialogDescription className="text-[#EAEAEA]/70">
            Manage your account information and security settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-[#8A2BE2]/20 data-[state=active]:text-[#8A2BE2]"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-[#8A2BE2]/20 data-[state=active]:text-[#8A2BE2]"
            >
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#EAEAEA]">
                  Username
                </Label>
                <GlassInput
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email
                </Label>
                <GlassInput
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="opacity-60"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving..." : "Update Profile"}
                </GlassButton>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[#EAEAEA]">
                  Current Password
                </Label>
                <GlassInput
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#EAEAEA]">
                  New Password
                </Label>
                <GlassInput
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#EAEAEA]">
                  Confirm New Password
                </Label>
                <GlassInput
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="warning" disabled={isSavingPassword}>
                  {isSavingPassword ? "Saving..." : "Change Password"}
                </GlassButton>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
