"use client";

import { useState, useEffect, useRef } from "react";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassButton } from "@/components/ui/GlassButton";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Search, User, Shield, Check } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  value: string;
  type: "user" | "account";
}

export function GlobalAccessManager() {
  const [accountQuery, setAccountQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [accountResults, setAccountResults] = useState<SearchResult[]>([]);
  const [userResults, setUserResults] = useState<SearchResult[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SearchResult | null>(
    null,
  );
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [isSearchingAccount, setIsSearchingAccount] = useState(false);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accountQuery.length >= 2 && !selectedAccount) {
        setIsSearchingAccount(true);
        apiGet<SearchResult[]>(
          `/api/admin/search?type=account&query=${encodeURIComponent(accountQuery)}`,
        )
          .then(setAccountResults)
          .catch((err) => console.error(err))
          .finally(() => setIsSearchingAccount(false));
      } else {
        setAccountResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [accountQuery, selectedAccount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userQuery.length >= 2 && !selectedUser) {
        setIsSearchingUser(true);
        apiGet<SearchResult[]>(
          `/api/admin/search?type=user&query=${encodeURIComponent(userQuery)}`,
        )
          .then(setUserResults)
          .catch((err) => console.error(err))
          .finally(() => setIsSearchingUser(false));
      } else {
        setUserResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery, selectedUser]);

  const handleGrantAccess = async () => {
    if (!selectedAccount || !selectedUser) return;

    setIsSubmitting(true);
    try {
      await apiPost("/api/admin/share-account", {
        accountId: selectedAccount.value,
        targetUserId: selectedUser.value,
      });
      toast.success(`Access granted!`, {
        description: `${selectedUser.label} can now access ${selectedAccount.label}`,
      });
      // Reset
      setSelectedAccount(null);
      setSelectedUser(null);
      setAccountQuery("");
      setUserQuery("");
    } catch (error: any) {
      toast.error("Failed to grant access", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard className="relative overflow-visible z-20">
      <GlassCardHeader>
        <GlassCardTitle className="text-[#DA70D6] flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Global Access Manager
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid md:grid-cols-2 gap-6 relative">
          {/* Account Search */}
          <div className="space-y-2 relative">
            <label className="text-sm text-gray-400">Select Account</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <GlassInput
                placeholder="Search by Tag or Email..."
                className="pl-9"
                value={selectedAccount ? selectedAccount.label : accountQuery}
                onChange={(e) => {
                  setAccountQuery(e.target.value);
                  setSelectedAccount(null);
                }}
              />
              {isSearchingAccount && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-[#8A2BE2]" />
              )}
            </div>
            {/* Account Results Dropdown */}
            {accountResults.length > 0 && !selectedAccount && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                {accountResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full text-left px-4 py-2 hover:bg-[#8A2BE2]/20 text-sm text-gray-200 transition-colors flex items-center justify-between group"
                    onClick={() => {
                      setSelectedAccount(result);
                      setAccountResults([]);
                      setAccountQuery(result.label);
                    }}
                  >
                    <span>{result.label}</span>
                    <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[#8A2BE2]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Search */}
          <div className="space-y-2 relative">
            <label className="text-sm text-gray-400">Select User</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <GlassInput
                placeholder="Search by Username or Email..."
                className="pl-9"
                value={selectedUser ? selectedUser.label : userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  setSelectedUser(null);
                }}
              />
              {isSearchingUser && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-[#DA70D6]" />
              )}
            </div>
            {/* User Results Dropdown */}
            {userResults.length > 0 && !selectedUser && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl max-h-60 overflow-y-auto z-50">
                {userResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full text-left px-4 py-2 hover:bg-[#DA70D6]/20 text-sm text-gray-200 transition-colors flex items-center justify-between group"
                    onClick={() => {
                      setSelectedUser(result);
                      setUserResults([]);
                      setUserQuery(result.label);
                    }}
                  >
                    <span>{result.label}</span>
                    <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 text-[#DA70D6]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <GlassButton
            onClick={handleGrantAccess}
            disabled={!selectedAccount || !selectedUser || isSubmitting}
            variant="primary"
            className="w-full md:w-auto bg-gradient-to-r from-[#8A2BE2] to-[#DA70D6] hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Granting Access...
              </>
            ) : (
              "Grant Access"
            )}
          </GlassButton>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
