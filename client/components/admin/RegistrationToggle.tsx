"use client";

import { useState, useEffect } from "react";
import { GlassSwitch } from "@/components/ui/GlassSwitch"; // Assuming we have or will treat Switch as GlassSwitch
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function RegistrationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiGet<{ allowed: boolean }>(
        "/api/admin/registrations/status",
      );
      setEnabled(data.allowed);
    } catch (error) {
      console.error("Failed to fetch registration status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    // Optimistic update
    setEnabled(checked);
    try {
      const data = await apiPost<{ message: string; allowed: boolean }>(
        "/api/admin/registrations/toggle",
        {},
      );
      setEnabled(data.allowed);
      toast.success(data.message);
    } catch (error) {
      setEnabled(!checked); // Revert
      toast.error("Failed to toggle registrations");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading status...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
      <div className="space-y-0.5">
        <Label
          htmlFor="reg-toggle"
          className="text-sm font-medium text-gray-200"
        >
          User Registration
        </Label>
        <p className="text-xs text-gray-500">Allow new users to sign up</p>
      </div>
      <div className="flex items-center gap-2">
        {toggling && (
          <Loader2 className="w-3 h-3 animate-spin text-[#00ff88]" />
        )}
        <Switch
          id="reg-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling}
          className="data-[state=checked]:bg-[#00ff88]"
        />
      </div>
    </div>
  );
}
