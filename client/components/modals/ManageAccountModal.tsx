"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
import { apiGet, apiPut, apiDelete } from "@/lib/api"

interface GoogleAccount {
  id: string
  google_email: string
  is_primary: boolean
}

interface Credential {
  id: string
  name: string
  type: "password" | "otp" | "api_key"
  lastUsed: string
  isShared: boolean
  sharedWith: { id: string; email: string; }[]
  owner: string
  googleAccountId?: string
}

interface ManageAccountModalProps {
  isOpen: boolean
  onClose: () => void
  credential: Credential | null
  onActionSuccess?: () => void | Promise<void>
}

export function ManageAccountModal({ isOpen, onClose, credential, onActionSuccess }: ManageAccountModalProps) {
  const [formData, setFormData] = useState({
    battletag: "",
    email: "",
    password: "",
    googleAccountId: "",
    notes: "",
  })
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (credential) {
      setFormData({
        battletag: credential.name,
        email: "", // Would be fetched from API
        password: "", // Would be fetched from API
        googleAccountId: credential.googleAccountId || "", // Would be fetched from API
        notes: "", // Would be fetched from API
      })
    }
  }, [credential])

  // Fetch linked Google accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGoogleAccounts()
    }
  }, [isOpen])

  const fetchGoogleAccounts = async () => {
    setIsLoadingAccounts(true)
    try {
      const data = await apiGet<{ accounts: GoogleAccount[] }>('/api/google-auth/accounts')
      setGoogleAccounts(data.accounts || [])
      
      // Auto-select the account that was associated with this credential
      if (credential?.googleAccountId && !formData.googleAccountId) {
        setFormData(prev => ({ ...prev, googleAccountId: credential.googleAccountId || "" }))
      }
    } catch (error) {
      console.error("Error fetching Google accounts:", error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credential) return

    setIsLoading(true)

    try {
      await apiPut(`/api/overwatch-accounts/${credential.id}`, {
        battletag: formData.battletag || undefined,
        email: formData.email || undefined,
        password: formData.password || undefined,
        googleAccountId: formData.googleAccountId || undefined,
        notes: formData.notes || undefined,
      })
      
      onClose()
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      console.error("Update account error:", error)
      alert("Failed to update Overwatch account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!credential) return

    try {
      await apiDelete(`/api/overwatch-accounts/${credential.id}`)
      
      setShowDeleteDialog(false)
      onClose()
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      console.error("Delete account error:", error)
      alert("Failed to delete Overwatch account")
    }
  }

  if (!credential) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
        <DialogHeader>
          <DialogTitle className="text-[#8A2BE2] text-xl">Manage Overwatch Account</DialogTitle>
          <DialogDescription className="text-[#EAEAEA]/70">Edit or delete "{credential.name}"</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="battletag" className="text-[#EAEAEA]">
              Battletag *
            </Label>
            <GlassInput
              id="battletag"
              value={formData.battletag}
              onChange={(e) => handleInputChange("battletag", e.target.value)}
              placeholder="e.g., PlayerName#1234"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#EAEAEA]">
              Battle.net Email
            </Label>
            <GlassInput
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter Battle.net account email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#EAEAEA]">
              Password
            </Label>
            <GlassInput
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter new password (leave blank to keep current)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleAccount" className="text-[#EAEAEA]">
              OTP Gmail Account
            </Label>
            {isLoadingAccounts ? (
              <div className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]/50 p-2 rounded text-sm">
                Loading Google accounts...
              </div>
            ) : googleAccounts.length > 0 ? (
              <Select
                value={formData.googleAccountId}
                onValueChange={(value) => handleInputChange("googleAccountId", value)}
              >
                <SelectTrigger className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                  <SelectValue placeholder="Select Gmail account for OTP" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111]/95 backdrop-blur-md border-white/10">
                  {googleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.google_email}
                      {account.is_primary && " (Primary)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]/50 p-3 rounded text-sm">
                No Google accounts linked. Please link a Gmail account first from the dashboard.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#EAEAEA]">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes (optional)"
              className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA] placeholder:text-[#EAEAEA]/50"
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <GlassButton type="button" variant="destructive">
                  Delete
                </GlassButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-400">Delete Overwatch Account</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#EAEAEA]/70">
                    Are you sure you want to delete "{credential.name}"? This action cannot be undone and will revoke
                    access for all shared users.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-[#EAEAEA] hover:bg-white/10">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-500/80 hover:bg-red-500 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="space-x-2">
              <GlassButton type="button" variant="ghost" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" disabled={isLoading || !formData.battletag}>
                {isLoading ? "Updating..." : "Update"}
              </GlassButton>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
