"use client";

import { useState } from "react";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { ConfirmationDialog } from "@/components/admin/ConfirmationDialog";
import { apiPost, apiGet, apiDownload } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  AlertTriangle,
  Power,
  Database,
  Trash2,
  Loader2,
  Zap,
} from "lucide-react";

export function QuickActions() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isForceLogoutOpen, setIsForceLogoutOpen] = useState(false);

  // Helper to handle API calls with loading state and toast
  const executeAction = async (
    actionId: string,
    run: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setLoadingAction(actionId);
    try {
      await run();
      toast.success(successMessage);
    } catch (error) {
      toast.error("Action Failed", {
        description: errorMessage(error, "An unexpected error occurred"),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <GlassCard className="mb-8">
      <GlassCardHeader>
        <GlassCardTitle className="text-[#DA70D6] flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Maintenance Mode */}
          <GlassButton
            onClick={() =>
              executeAction(
                "maintenance",
                async () => {
                  const { enabled } = await apiGet<{ enabled: boolean }>(
                    "/admin/registration-status",
                  );
                  await apiPost("/admin/toggle-registrations", {
                    enabled: !enabled,
                  });
                },
                "Registration status toggled",
              )
            }
            variant="ghost"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-yellow-500/10 border-yellow-500/20"
            disabled={loadingAction === "maintenance"}
          >
            {loadingAction === "maintenance" ? (
              <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
            <span className="text-sm font-medium">Maintenance Mode</span>
            <span className="text-xs text-gray-400">Toggle Registrations</span>
          </GlassButton>

          {/* Force Logout */}
          <GlassButton
            onClick={() => setIsForceLogoutOpen(true)}
            variant="ghost"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-red-500/10 border-red-500/20"
            disabled={loadingAction === "logout"}
          >
            {loadingAction === "logout" ? (
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            ) : (
              <Power className="w-6 h-6 text-red-500" />
            )}
            <span className="text-sm font-medium">Force Logout All</span>
            <span className="text-xs text-gray-400">Emergency Security</span>
          </GlassButton>

          {/* Export Users */}
          <GlassButton
            onClick={() =>
              executeAction(
                "export",
                async () => {
                  const blob = await apiDownload("/admin/export-users");
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "users_export.csv";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                },
                "User export started",
              )
            }
            variant="ghost"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-500/10 border-blue-500/20"
            disabled={loadingAction === "export"}
          >
            {loadingAction === "export" ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            ) : (
              <Database className="w-6 h-6 text-blue-500" />
            )}
            <span className="text-sm font-medium">Export Users</span>
            <span className="text-xs text-gray-400">Download CSV</span>
          </GlassButton>

          {/* Clear Cache */}
          <GlassButton
            onClick={() =>
              executeAction(
                "cache",
                () => apiPost("/admin/clear-cache"),
                "System cache cleared",
              )
            }
            variant="ghost"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-500/10 border-purple-500/20"
            disabled={loadingAction === "cache"}
          >
            {loadingAction === "cache" ? (
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            ) : (
              <Trash2 className="w-6 h-6 text-purple-500" />
            )}
            <span className="text-sm font-medium">Clear Cache</span>
            <span className="text-xs text-gray-400">System Maintenance</span>
          </GlassButton>
        </div>
      </GlassCardContent>

      <ConfirmationDialog
        open={isForceLogoutOpen}
        onClose={() => setIsForceLogoutOpen(false)}
        onConfirm={() => {
          setIsForceLogoutOpen(false);
          executeAction(
            "logout",
            () => apiPost("/admin/force-logout"),
            "All users forced logged out",
          );
        }}
        title="Force logout all users?"
        description="Are you sure? This will log out ALL users immediately."
        confirmText="Force Logout"
        variant="destructive"
      />
    </GlassCard>
  );
}
