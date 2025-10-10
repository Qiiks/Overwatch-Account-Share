"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function RegistrationToggle() {
  const [allowRegistration, setAllowRegistration] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchRegistrationStatus()
  }, [])

  const fetchRegistrationStatus = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const token = localStorage.getItem("auth_token")
      
      const response = await fetch(`${apiBase}/api/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }

      const data = await response.json()
      setAllowRegistration(data.allowRegistration || false)
    } catch (error) {
      console.error("Failed to fetch registration status:", error)
      toast.error("Failed to load registration settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRegistration = async (checked: boolean) => {
    setIsUpdating(true)
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001"
      const token = localStorage.getItem("auth_token")
      
      const response = await fetch(`${apiBase}/api/settings/registration`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ allowRegistration: checked }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update registration setting: ${response.status}`)
      }

      const data = await response.json()
      setAllowRegistration(data.allowRegistration)
      
      toast.success(
        checked 
          ? "Registration has been enabled. New users can now sign up."
          : "Registration has been disabled. New users cannot sign up."
      )
    } catch (error) {
      console.error("Failed to update registration status:", error)
      toast.error("Failed to update registration setting")
      // Revert the switch on error
      setAllowRegistration(!checked)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center justify-between space-x-4">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor="registration-toggle" className="text-base font-medium text-[#EAEAEA]">
          User Registration
        </Label>
        <p className="text-sm text-[#EAEAEA]/60">
          {allowRegistration 
            ? "New users can create accounts on the platform"
            : "Registration is closed. Only existing users can log in"}
        </p>
      </div>
      <Switch
        id="registration-toggle"
        checked={allowRegistration}
        onCheckedChange={handleToggleRegistration}
        disabled={isLoading || isUpdating}
        className="data-[state=checked]:bg-[#DA70D6] data-[state=unchecked]:bg-[#EAEAEA]/20"
      />
    </div>
  )
}