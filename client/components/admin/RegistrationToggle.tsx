"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
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
      const data = await apiGet<{ enabled: boolean }>("/admin/registration-status");
      setEnabled(data.enabled);
    } catch (error) {
      toast.error("Failed to load registration status", {
        description: errorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    // Optimistic update
    setEnabled(checked);
    try {
      const data = await apiPost<{ enabled: boolean }>("/admin/toggle-registrations", {
        enabled: checked,
      });
      setEnabled(data.enabled);
      toast.success(data.enabled ? "Registrations enabled" : "Registrations disabled");
    } catch (error) {
      setEnabled(!checked); // Revert
      toast.error("Failed to toggle registrations", {
        description: errorMessage(error),
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <span className="flex items-center gap-2 font-mono text-2xs tracking-label text-ink-3 uppercase">
        <Loader2 className="size-3 animate-spin" /> Loading status…
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
      <div className="min-w-0">
        <Label
          htmlFor="reg-toggle"
          className="font-mono text-2xs tracking-label text-ink-2 uppercase"
        >
          User registration
        </Label>
        <p className="mt-0.5 font-mono text-2xs text-ink-3">
          Allow new users to sign up
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        {toggling && <Loader2 className="size-3 animate-spin text-signal" />}
        <Switch
          id="reg-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling}
          className="data-[state=checked]:bg-signal"
        />
      </div>
    </div>
  );
}
