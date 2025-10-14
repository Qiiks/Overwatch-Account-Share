"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { apiGet, apiPatch } from "@/lib/api"
import { useSettings } from "@/context/SettingsContext"

export function RegistrationToggle() {
  const [allowRegistration, setAllowRegistration] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const { refetchSettings } = useSettings()

  useEffect(() => {
    fetchRegistrationStatus()
  }, [])

  const fetchRegistrationStatus = async () => {
    try {
      const data = await apiGet<{ data: { allow_registration: boolean }; allow_registration?: boolean }>('/api/settings')
      
      // Backend returns data.data.allow_registration for public settings
      const registrationStatus = data.data?.allow_registration ?? data.allow_registration ?? false
      setAllowRegistration(registrationStatus)
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
      const data = await apiPatch<{ data: { value: boolean } }>('/api/settings/registration', {
        allow_registration: checked
      })
      
      // Backend returns data.data.value for the updated setting
      setAllowRegistration(data.data?.value ?? checked)
      
      // Refresh global settings context so other components get the updated value
      await refetchSettings()
      
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