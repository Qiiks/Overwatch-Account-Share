"use client";

import { useState } from "react";
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
} from "lucide-react";

interface ActionTile {
  id: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: string;
  onClick: () => void;
}

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

  const actions: ActionTile[] = [
    {
      id: "maintenance",
      icon: <AlertTriangle className="size-4" />,
      label: "Maintenance mode",
      hint: "Toggle registrations",
      tone: "text-warn",
      onClick: () =>
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
        ),
    },
    {
      id: "logout",
      icon: <Power className="size-4" />,
      label: "Force logout all",
      hint: "Emergency security",
      tone: "text-alarm",
      onClick: () => setIsForceLogoutOpen(true),
    },
    {
      id: "export",
      icon: <Database className="size-4" />,
      label: "Export users",
      hint: "Download CSV",
      tone: "text-chan-mail",
      onClick: () =>
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
        ),
    },
    {
      id: "cache",
      icon: <Trash2 className="size-4" />,
      label: "Clear cache",
      hint: "System maintenance",
      tone: "text-ink-3",
      onClick: () =>
        executeAction(
          "cache",
          () => apiPost("/admin/clear-cache"),
          "System cache cleared",
        ),
    },
  ];

  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={loadingAction === action.id}
            className="flex items-center gap-3 border-b border-line px-3.5 py-3 text-left transition-colors duration-150 ease-standard last:border-b-0 hover:bg-white/[0.025] disabled:opacity-50 sm:border-r lg:last:border-r-0"
          >
            <span className={`grid size-7 flex-none place-items-center rounded-md border border-line-2 ${action.tone}`}>
              {loadingAction === action.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                action.icon
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-xs font-medium text-ink">
                {action.label}
              </span>
              <span className="block font-mono text-2xs tracking-[0.05em] text-ink-3 uppercase">
                {action.hint}
              </span>
            </span>
          </button>
        ))}
      </div>

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
    </div>
  );
}
