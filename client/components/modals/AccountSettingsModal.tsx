"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle profile update
    console.log("Profile update:", { username: formData.username, email: formData.email })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      alert("New passwords don't match")
      return
    }
    // Handle password change
    console.log("Password change")
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email
                </Label>
                <GlassInput
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary">
                  Update Profile
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
                />
              </div>

              <div className="flex justify-end space-x-2">
                <GlassButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="warning">
                  Change Password
                </GlassButton>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
