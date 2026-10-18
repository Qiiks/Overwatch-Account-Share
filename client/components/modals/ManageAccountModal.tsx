"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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
import { errorMessage } from "@/lib/errors"
import { toast } from "sonner"

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
  const fetchGoogleAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const data = await apiGet<{ accounts: GoogleAccount[] }>('/api/google-auth/accounts')
      setGoogleAccounts(data.accounts || [])

      // Auto-select the account that was associated with this credential
      const preferredId = credential?.googleAccountId
      if (preferredId) {
        setFormData(prev =>
          prev.googleAccountId ? prev : { ...prev, googleAccountId: preferredId },
        )
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load Google accounts"))
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [credential])

  useEffect(() => {
    if (isOpen) {
      fetchGoogleAccounts()
    }
  }, [isOpen, fetchGoogleAccounts])

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
      
      toast.success("Overwatch account updated")
      onClose()
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update Overwatch account"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!credential) return

    try {
      await apiDelete(`/api/overwatch-accounts/${credential.id}`)

      toast.success("Overwatch account deleted")
      setShowDeleteDialog(false)
      onClose()
      // Trigger data refresh without page reload
      if (onActionSuccess) {
        await onActionSuccess()
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete Overwatch account"))
    }
  }

  if (!credential) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-line-2 bg-panel-2 text-ink sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xs tracking-label text-ink-2 uppercase">
            Manage Overwatch account
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-3">Edit or delete {`"${credential.name}"`}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="battletag" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
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

          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
              Battle.net email
            </Label>
            <GlassInput
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter Battle.net account email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
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

          <div className="space-y-1.5">
            <Label htmlFor="googleAccount" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
              OTP Gmail account
            </Label>
            {isLoadingAccounts ? (
              <div className="rounded-md border border-line bg-ground px-2.5 py-2 font-mono text-2xs text-ink-3">
                Loading Google accounts…
              </div>
            ) : googleAccounts.length > 0 ? (
              <Select
                value={formData.googleAccountId}
                onValueChange={(value) => handleInputChange("googleAccountId", value)}
              >
                <SelectTrigger className="w-full border-line-2 bg-ground text-ink">
                  <SelectValue placeholder="Select Gmail account for OTP" />
                </SelectTrigger>
                <SelectContent className="border-line-2 bg-panel-2 text-ink">
                  {googleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.google_email}
                      {account.is_primary && " (Primary)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-line bg-ground px-2.5 py-2 font-mono text-2xs text-ink-3">
                No Google accounts linked. Please link a Gmail account first from the dashboard.
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes (optional)"
              className="border-line-2 bg-ground text-ink placeholder:text-ink-3"
              rows={3}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <GlassButton
                  type="button"
                  variant="ghost"
                  className="border-alarm/50 text-alarm hover:bg-alarm/10 hover:text-alarm"
                >
                  Delete
                </GlassButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-line-2 bg-panel-2 text-ink">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-mono text-2xs tracking-label text-alarm uppercase">
                    Delete Overwatch account
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-ink-2">
                    Are you sure you want to delete {`"${credential.name}"`}? This action cannot be undone and will
                    revoke access for all shared users.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-line-2 bg-transparent text-ink-2 hover:bg-white/5 hover:text-ink">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-alarm text-ground hover:bg-alarm/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <GlassButton type="button" variant="ghost" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" disabled={isLoading || !formData.battletag}>
                {isLoading ? "Updating…" : "Update"}
              </GlassButton>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
