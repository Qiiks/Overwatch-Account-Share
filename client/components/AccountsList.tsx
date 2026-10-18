"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { CyberpunkCredentialDisplay } from "./CyberpunkCredentialDisplay";
import { Shield, Users, User, Lock, Unlock, Share2 } from "lucide-react";
import { ShareAccountDialog } from "./ShareAccountDialog";

interface AccountOwner {
  id: string;
  username: string;
}

interface OverwatchAccount {
  id: string;
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  rank?: string;
  mainHeroes?: string[];
  owner: AccountOwner;
  hasAccess: boolean;
  accessType: "owner" | "shared" | "none";
  otp?: string;
}

interface Credentials {
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  otp: string;
  hasAccess: boolean;
  accessType: string;
}

interface AccountsListProps {
  onDataChange?: () => void | Promise<void>;
}

interface ShareDialogState {
  isOpen: boolean;
  accountId: string;
  accountTag: string;
}

export function AccountsList({ onDataChange }: AccountsListProps = {}) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<OverwatchAccount[]>([]);
  const [credentials, setCredentials] = useState<Record<string, Credentials>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [newOtpAccounts, setNewOtpAccounts] = useState<Set<string>>(new Set());
  const [shareDialog, setShareDialog] = useState<ShareDialogState>({
    isOpen: false,
    accountId: "",
    accountTag: "",
  });
  // Create a map of accountTag to accountId for OTP updates
  const accountTagToIdMapRef = useRef<Record<string, string>>({});

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await apiGet<
        OverwatchAccount[] | { accounts: OverwatchAccount[] }
      >("/api/overwatch-accounts/all-public");
      const accountsData = [
        ...(Array.isArray(response) ? response : response?.accounts ?? []),
      ];
      setAccounts(accountsData);

      // Update the accountTag to accountId mapping
      accountTagToIdMapRef.current = accountsData.reduce(
        (map, account) => {
          map[account.accountTag] = account.id;
          return map;
        },
        {} as Record<string, string>,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Failed to fetch accounts"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch credentials for a specific account
  const fetchCredentials = async (accountId: string) => {
    try {
      const fetched = await apiGet<Credentials | { credentials: Credentials }>(
        `/api/overwatch-accounts/${accountId}/credentials`,
      );
      const data = "credentials" in fetched ? fetched.credentials : fetched;
      setCredentials((prev) => ({ ...prev, [accountId]: data }));
      toast.success("Credentials fetched successfully");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to fetch credentials"));
    }
  };

  const refreshAll = useCallback(async () => {
    await fetchAccounts();
    await onDataChange?.();
  }, [fetchAccounts, onDataChange]);

  // OTP pushes are addressed to the account owner and its shared users; match on the account tag.
  const handleOtpUpdate = useCallback(
    (data: { accountTag: string; otp: string }) => {
      toast.success(`🔐 NEW OTP DETECTED: ${data.accountTag}`, {
        duration: 5000,
        position: "top-right",
      });

      const accountId = accountTagToIdMapRef.current[data.accountTag];
      if (accountId) {
        setNewOtpAccounts((prev) => new Set(prev).add(accountId));
        // Remove pulse effect after 5 seconds
        setTimeout(() => {
          setNewOtpAccounts((prev) => {
            const updated = new Set(prev);
            updated.delete(accountId);
            return updated;
          });
        }, 5000);
      }

      setAccounts((prevAccounts) =>
        prevAccounts.map((account) =>
          account.accountTag === data.accountTag
            ? { ...account, otp: data.otp }
            : account,
        ),
      );

      if (accountId) {
        setCredentials((prev) =>
          prev[accountId]
            ? { ...prev, [accountId]: { ...prev[accountId], otp: data.otp } }
            : prev,
        );
      }
    },
    [],
  );

  useEffect(() => {
    void fetchAccounts();

    const socket = connectSocket();
    socket.on("otp_update", handleOtpUpdate);

    return () => {
      socket.off("otp_update", handleOtpUpdate);
      socket.disconnect();
    };
  }, [fetchAccounts, handleOtpUpdate]);

  // Share account access with another user
  const openShareDialog = (account: OverwatchAccount) => {
    setShareDialog({
      isOpen: true,
      accountId: account.id,
      accountTag: account.accountTag,
    });
  };

  const closeShareDialog = () => {
    setShareDialog((prev) => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400 terminal-text">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-2">
            Overwatch Accounts
          </h1>
          <p className="text-sm text-gray-400">
            All accounts are visible • Credentials require authorization
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <div
              key={account.id}
              className={`account-card bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6 relative overflow-hidden ${newOtpAccounts.has(account.id) ? "glitch-pulse" : ""}`}
            >
              {/* Account Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                    {account.accountTag}
                    {account.hasAccess && account.accessType === "owner" && (
                      <span title="Owner">
                        <Shield size={16} className="text-green-400" />
                      </span>
                    )}
                    {account.hasAccess && account.accessType === "shared" && (
                      <span title="Shared Access">
                        <Users size={16} className="text-blue-400" />
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                    <User size={12} />
                    Owner: {account.owner?.username || "Unknown"}
                  </p>
                  {account.rank && (
                    <p className="text-sm text-purple-400 mt-1">
                      Rank: {account.rank}
                    </p>
                  )}
                </div>

                {/* Access Badge */}
                <div className="flex gap-2">
                  {account.hasAccess ? (
                    <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400 flex items-center gap-1">
                      <Unlock size={12} />
                      {account.accessType === "owner" ? "OWNER" : "SHARED"}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-400 flex items-center gap-1">
                      <Lock size={12} />
                      LOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* Credentials Display */}
              <div className="space-y-4">
                <CyberpunkCredentialDisplay
                  label="Battle.net Email"
                  value={
                    credentials[account.id]?.accountEmail ||
                    account.accountEmail
                  }
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                />

                <CyberpunkCredentialDisplay
                  label="Password"
                  value={
                    credentials[account.id]?.accountPassword ||
                    account.accountPassword
                  }
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                />

                <CyberpunkCredentialDisplay
                  label="OTP Code"
                  value={
                    credentials[account.id]?.otp ||
                    account.otp ||
                    (account.hasAccess ? "--:--:--" : "CIPHER::OTP::LOCKED")
                  }
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                {(account.accessType === "owner" ||
                  ((user?.role === "admin" || user?.isAdmin) &&
                    account.hasAccess)) && (
                  <button
                    onClick={() => openShareDialog(account)}
                    className="flex-1 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-sm text-purple-300 hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Access
                  </button>
                )}
              </div>

              {/* Main Heroes Display */}
              {account.mainHeroes && account.mainHeroes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cyan-500/20">
                  <p className="text-xs text-gray-400 mb-2">Main Heroes:</p>
                  <div className="flex gap-2 flex-wrap">
                    {account.mainHeroes.map((hero, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-400"
                      >
                        {hero}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scan line effect */}
              <div className="scan-line"></div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <Lock size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
              No Overwatch accounts found in the database.
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 pt-8 border-t border-cyan-500/20 text-center">
        <p className="text-xs text-gray-500">
          Total Accounts: {accounts.length} • Accessible:{" "}
          {accounts.filter((a) => a.hasAccess).length} • Locked:{" "}
          {accounts.filter((a) => !a.hasAccess).length}
        </p>
      </div>
      <ShareAccountDialog
        isOpen={shareDialog.isOpen}
        onClose={closeShareDialog}
        accountId={shareDialog.accountId}
        accountTag={shareDialog.accountTag}
        onShareSuccess={() => {
          closeShareDialog();
          void refreshAll();
        }}
      />
    </div>
  );
}
