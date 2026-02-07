"use client";

import { useState } from "react";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { apiPost, apiGet } from "@/lib/api";
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

  // Helper to handle API calls with loading state and toast
  const executeAction = async (
    actionId: string,
    endpoint: string,
    method: "POST" | "GET" = "POST",
    successMessage: string,
  ) => {
    setLoadingAction(actionId);
    try {
      if (method === "GET") {
        // Handle file download for CSV
        if (endpoint.includes("export")) {
          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          });
          if (!response.ok) throw new Error("Export failed");
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "users_export.csv";
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          toast.success(successMessage);
          return;
        }
        await apiGet(endpoint);
      } else {
        await apiPost(endpoint, {});
      }
      toast.success(successMessage);
    } catch (error: any) {
      toast.error("Action Failed", {
        description: error.message || "An unexpected error occurred",
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
                "/api/admin/toggle-registrations",
                "POST",
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
            onClick={() => {
              if (
                confirm(
                  "Are you sure? This will log out ALL users immediately.",
                )
              ) {
                executeAction(
                  "logout",
                  "/api/admin/force-logout",
                  "POST",
                  "All users forced logged out",
                );
              }
            }}
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
                "/api/admin/export-users",
                "GET",
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
                "/api/admin/clear-cache",
                "POST",
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
    </GlassCard>
  );
}
