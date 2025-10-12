"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { apiPost, apiPut } from "@/lib/api"

interface Credential {
  id: string
  name: string
  type: "password" | "otp" | "api_key"
  lastUsed: string
  isShared: boolean
  sharedWith: { id: string; email: string; }[]
  owner: string
}

interface ShareAccountModalProps {
  isOpen: boolean
  onClose: () => void
  credential: Credential | null
  onActionSuccess?: () => void | Promise<void>
}

export function ShareAccountModal({ isOpen, onClose, credential, onActionSuccess }: ShareAccountModalProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credential) return

    setIsLoading(true)

    try {
      await apiPost(`/api/overwatch-accounts/${credential.id}/share-by-email`, {
        email: email
      })
      
      setEmail("")
      onClose()
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      console.error("Share credential error:", error)
      alert("Failed to share credential")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async (userEmail: string) => {
    if (!credential) return

    try {
      // Calculate the remainingIds by filtering the credential.sharedWith array directly
      const remainingIds = credential.sharedWith
        .filter(user => user.email.toLowerCase() !== userEmail.toLowerCase())
        .map(user => user.id)

      await apiPut(`/api/overwatch-accounts/${credential.id}/access`, {
        userIds: remainingIds
      })
      
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      console.error("Revoke access error:", error)
      alert("Failed to revoke access")
    }
  }

  if (!credential) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
        <DialogHeader>
          <DialogTitle className="text-[#8A2BE2] text-xl">Share Credential</DialogTitle>
          <DialogDescription className="text-[#EAEAEA]/70">
            Share "{credential.name}" with other users securely
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share with new user */}
          <form onSubmit={handleShare} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#EAEAEA]">
                Share with user (email)
              </Label>
              <GlassInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user's email address"
                required
              />
            </div>

            <GlassButton type="submit" variant="primary" disabled={isLoading || !email} className="w-full">
              {isLoading ? "Sharing..." : "Share Credential"}
            </GlassButton>
          </form>

          {/* Currently shared with */}
          {credential.sharedWith.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[#EAEAEA]">Currently shared with:</Label>
              <div className="space-y-2">
                {credential.sharedWith.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#8A2BE2]/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-[#8A2BE2]">{user.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-[#EAEAEA]">{user.email}</span>
                    </div>
                    <GlassButton size="sm" variant="destructive" onClick={() => handleRevoke(user.email)}>
                      Revoke
                    </GlassButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {credential.sharedWith.length === 0 && (
            <div className="text-center py-4 text-[#EAEAEA]/50">
              This credential is not currently shared with anyone.
            </div>
          )}

          <div className="flex justify-end">
            <GlassButton variant="ghost" onClick={onClose}>
              Close
            </GlassButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
