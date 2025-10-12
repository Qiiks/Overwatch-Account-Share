"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GlassButton } from "@/components/ui/GlassButton"
import { GlassInput } from "@/components/ui/GlassInput"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiGet, apiPost } from "@/lib/api"

interface GoogleAccount {
  id: string
  google_email: string
  is_primary: boolean
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
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
      
      // Auto-select primary account if available
      const primaryAccount = data.accounts?.find((acc: GoogleAccount) => acc.is_primary)
      if (primaryAccount && !formData.googleAccountId) {
        setFormData(prev => ({ ...prev, googleAccountId: primaryAccount.id }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        battletag: formData.battletag,
        email: formData.email,
        password: formData.password,
        googleAccountId: formData.googleAccountId,
        notes: formData.notes,
      }
      
      console.log("Sending payload to /api/overwatch-accounts:", payload)
      
      await apiPost('/api/overwatch-accounts', payload)
      
      onClose()
      // Refresh the dashboard
      window.location.reload()
    } catch (error: any) {
      console.error("Add account error:", error)
      alert(error.message || "Failed to add Overwatch account")
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
      <DialogContent className="sm:max-w-[500px] bg-[#111111]/95 backdrop-blur-md border-white/10 text-[#EAEAEA]">
        <DialogHeader>
          <DialogTitle className="text-[#8A2BE2] text-xl">Add Overwatch Account</DialogTitle>
          <DialogDescription className="text-[#EAEAEA]/70">
            Add a new Overwatch account to your secure vault
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Battle.net Email *
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#EAEAEA]">
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

          <div className="space-y-2">
            <Label htmlFor="googleAccount" className="text-[#EAEAEA]">
              OTP Gmail Account *
            </Label>
            {isLoadingAccounts ? (
              <div className="bg-white/5 backdrop-blur-md border-white/10 text-[#EAEAEA]/50 p-2 rounded text-sm">
                Loading Google accounts...
              </div>
            ) : googleAccounts.length > 0 ? (
              <Select 
                value={formData.googleAccountId} 
                onValueChange={(value) => handleInputChange("googleAccountId", value)}
                required
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

          <div className="flex justify-end space-x-2 pt-4">
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
              {isLoading ? "Adding..." : "Add Account"}
            </GlassButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
