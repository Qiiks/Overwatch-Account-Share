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
      <DialogContent className="border-line-2 bg-panel-2 text-ink sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xs tracking-label text-ink-2 uppercase">
            Account settings
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-3">
            Manage your account information and security settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-md border border-line bg-ground p-0.5">
            <TabsTrigger
              value="profile"
              className="rounded-sm font-mono text-2xs tracking-label text-ink-3 uppercase data-[state=active]:bg-panel data-[state=active]:text-ink"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-sm font-mono text-2xs tracking-label text-ink-3 uppercase data-[state=active]:bg-panel data-[state=active]:text-ink"
            >
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 pt-3">
            <form onSubmit={handleProfileUpdate} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
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

              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
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

              <div className="flex justify-end gap-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving…" : "Update profile"}
                </GlassButton>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 pt-3">
            <form onSubmit={handlePasswordChange} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Current password
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

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  New password
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

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Confirm new password
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

              <div className="flex justify-end gap-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={isSavingPassword}>
                  {isSavingPassword ? "Saving…" : "Change password"}
                </GlassButton>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
