"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiGet, apiPost } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { toast } from "sonner"

interface GoogleAccount {
  id: string
  google_email: string
  is_primary: boolean
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}

export function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
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

  const fetchGoogleAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const data = await apiGet<{ accounts: GoogleAccount[] }>('/api/google-auth/accounts')
      const accounts = data.accounts || []
      setGoogleAccounts(accounts)

      // Auto-select primary account if available
      const primaryAccount = accounts.find((acc) => acc.is_primary)
      if (primaryAccount) {
        setFormData(prev =>
          prev.googleAccountId ? prev : { ...prev, googleAccountId: primaryAccount.id },
        )
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load Google accounts"))
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  // Fetch linked Google accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGoogleAccounts()
    }
  }, [isOpen, fetchGoogleAccounts])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await apiPost('/api/overwatch-accounts', {
        battletag: formData.battletag,
        email: formData.email,
        password: formData.password,
        googleAccountId: formData.googleAccountId,
        notes: formData.notes,
      })

      toast.success("Overwatch account added")
      resetForm()
      onClose()
      await onSuccess?.()
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add Overwatch account"))
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      battletag: "",
      email: "",
      password: "",
      googleAccountId: "",
      notes: "",
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="border-line-2 bg-panel-2 text-ink sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xs tracking-label text-ink-2 uppercase">
            Add Overwatch account
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-3">
            Add a new Overwatch account to your secure vault
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
              Battle.net email *
            </Label>
            <GlassInput
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter Battle.net account email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
              Password *
            </Label>
            <GlassInput
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter account password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="googleAccount" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
              OTP Gmail account *
            </Label>
            {isLoadingAccounts ? (
              <div className="rounded-md border border-line bg-ground px-2.5 py-2 font-mono text-2xs text-ink-3">
                Loading Google accounts…
              </div>
            ) : googleAccounts.length > 0 ? (
              <Select 
                value={formData.googleAccountId} 
                onValueChange={(value) => handleInputChange("googleAccountId", value)}
                required
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

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </GlassButton>
            <GlassButton 
              type="submit" 
              variant="primary" 
              disabled={
                isLoading || 
                !formData.battletag || 
                !formData.email || 
                !formData.password || 
                !formData.googleAccountId ||
                googleAccounts.length === 0
              }
            >
              {isLoading ? "Adding…" : "Add account"}
            </GlassButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
