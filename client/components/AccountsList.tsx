"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { apiGet, apiPost, getStoredAuthSession } from "@/lib/api";
import { CyberpunkCredentialDisplay } from "./CyberpunkCredentialDisplay";
import { GlassCard } from "./ui/GlassCard";
import { Shield, Users, User, Lock, Unlock } from "lucide-react";

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

export function AccountsList({ onDataChange }: AccountsListProps = {}) {
  const [accounts, setAccounts] = useState<OverwatchAccount[]>([]);
  const [credentials, setCredentials] = useState<Record<string, Credentials>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [newOtpAccounts, setNewOtpAccounts] = useState<Set<string>>(new Set());
  // Create a map of accountTag to accountId for OTP updates
  const accountTagToIdMapRef = useRef<Record<string, string>>({});

  // Fetch credentials for a specific account
  const fetchCredentials = async (accountId: string) => {
    try {
      const response = await apiGet(
        `/api/overwatch-accounts/${accountId}/credentials`,
      );
      setCredentials((prev) => ({
        ...prev,
        [accountId]: response.data,
      }));
      toast.success("Credentials fetched successfully");
    } catch (error: any) {
      console.error("Error fetching credentials:", error);
      toast.error(error.message || "Failed to fetch credentials");
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // Use the apiGet utility which now goes through the proxy
        const response = await apiGet("/api/overwatch-accounts/all-public");
        const accountsData = response.data || [];
        setAccounts(accountsData);

        // Update the accountTag to accountId mapping
        accountTagToIdMapRef.current = accountsData.reduce(
          (map: Record<string, string>, account: OverwatchAccount) => {
            map[account.accountTag] = account.id;
            return map;
          },
          {} as Record<string, string>,
        );
      } catch (error: any) {
        console.error("Error fetching accounts:", error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();

    // Establish WebSocket connection with authentication
    // Validate NEXT_PUBLIC_API_BASE_URL is set for WebSocket connections
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL environment variable is required but not set",
      );
    }
    const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const { token, expired } = getStoredAuthSession();

    if (expired) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"], // Allow both transports
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token || undefined, // Send token if available
      },
    });

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("WebSocket connected for OTP updates");
      newSocket.emit("subscribeToOTP");
      console.log("Subscribed to OTP updates");
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);
    });

    // Debug socket events
    newSocket.onAny((event, ...args) => {
      if (event.includes("otp")) {
        console.log("Received OTP-related socket event:", event, args);
      }
    });

    // Listen for OTP events
    const handleOtpUpdate = (data: { accountTag: string; otp: string }) => {
      console.log("Received OTP update:", data);

      // Show toast notification
      toast.success(`🔐 NEW OTP DETECTED: ${data.accountTag}`, {
        duration: 5000,
        position: "top-right",
      });

      // Trigger visual pulse effect
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

      // Update the accounts state with the new OTP
      setAccounts((prevAccounts) => {
        const updatedAccounts = prevAccounts.map((account) =>
          account.accountTag === data.accountTag
            ? { ...account, otp: data.otp }
            : account,
        );
        console.log("Updated accounts state:", updatedAccounts);
        return updatedAccounts;
      });

      // Update credentials if we have them cached - use the accountTag to accountId mapping
      setCredentials((prev) => {
        const updatedCreds = { ...prev };
        const accountId = accountTagToIdMapRef.current[data.accountTag];
        console.log("Account ID for tag:", data.accountTag, "is:", accountId);
        console.log("Current credentials keys:", Object.keys(updatedCreds));
        if (accountId && updatedCreds[accountId]) {
          updatedCreds[accountId].otp = data.otp;
          console.log("Updated credentials for account ID:", accountId);
        } else {
          console.log("No credentials cached for account ID:", accountId);
        }
        return updatedCreds;
      });
    };

    newSocket.on("otp", handleOtpUpdate);
    newSocket.on("otp_update", handleOtpUpdate);

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      if (newSocket) {
        console.log("Disconnecting WebSocket");
        newSocket.off("otp", handleOtpUpdate);
        newSocket.off("otp_update", handleOtpUpdate);
        newSocket.disconnect();
      }
    };
  }, []);

  // Share account access with another user
  const shareAccountAccess = async (accountId: string) => {
    const email = prompt(
      "Enter the email address of the user you want to share with:",
    );

    if (!email) {
      return; // User cancelled
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const data = await apiPost(
        `/api/overwatch-accounts/${accountId}/share-by-email`,
        { email },
      );
      toast.success(data.message || "Account shared successfully");

      // Refresh the accounts list to show updated shared status
      const accountsData = await apiGet("/api/overwatch-accounts/all-public");
      setAccounts(accountsData.data || []);

      // Trigger parent data refresh if provided
      onDataChange?.();
    } catch (error: any) {
      console.error("Error sharing account:", error);

      // Provide more specific error messages based on the error response
      let errorMessage = "Failed to share account";

      if (error.response?.data?.error) {
        // Handle error array from backend (like validation errors)
        if (Array.isArray(error.response.data.error)) {
          const errorMsgs = error.response.data.error
            .map((e: any) => e.msg || String(e))
            .filter(Boolean);
          if (errorMsgs.length > 0) {
            errorMessage = errorMsgs.join(", ");
          }
        } else {
          errorMessage = String(error.response.data.error);
        }
      } else if (error.response?.data?.message) {
        errorMessage = String(error.response.data.message);
      } else if (error.message) {
        errorMessage = String(error.message);
      }

      toast.error(errorMessage);
    }
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
                  accountId={account.id}
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
                  accountId={account.id}
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
                  accountId={account.id}
                />
                {process.env.NODE_ENV !== "production" && (
                  <div className="text-xs text-gray-500">
                    Debug: OTP from credentials:{" "}
                    {credentials[account.id]?.otp || "none"}, from account:{" "}
                    {account.otp || "none"}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                {account.hasAccess && account.accessType === "owner" && (
                  <button
                    onClick={() => shareAccountAccess(account.id)}
                    className="flex-1 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-sm text-purple-300 hover:bg-purple-500/30 transition-all"
                  >
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
    </div>
  );
}
