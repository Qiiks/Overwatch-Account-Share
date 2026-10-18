"use client";

import { useState, useEffect } from "react";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassButton } from "@/components/ui/GlassButton";
import { apiGet, apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { Loader2, Search, User, Check } from "lucide-react";

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
          `/admin/search?type=account&query=${encodeURIComponent(accountQuery)}`,
        )
          .then(setAccountResults)
          .catch((error) => {
            toast.error("Account search failed", {
              description: errorMessage(error),
            });
          })
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
          `/admin/search?type=user&query=${encodeURIComponent(userQuery)}`,
        )
          .then(setUserResults)
          .catch((error) => {
            toast.error("User search failed", {
              description: errorMessage(error),
            });
          })
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
      await apiPost("/admin/share-account", {
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
    } catch (error) {
      toast.error("Failed to grant access", {
        description: errorMessage(error, "Unknown error occurred"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="grid gap-4 p-3.5 md:grid-cols-2">
        {/* Account Search */}
        <div className="relative space-y-1.5">
          <label className="font-mono text-2xs tracking-label text-ink-3 uppercase">
            Select account
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <GlassInput
              placeholder="Search by tag or email…"
              className="pl-8"
              value={selectedAccount ? selectedAccount.label : accountQuery}
              onChange={(e) => {
                setAccountQuery(e.target.value);
                setSelectedAccount(null);
              }}
            />
            {isSearchingAccount && (
              <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-signal" />
            )}
          </div>
          {/* Account Results Dropdown */}
          {accountResults.length > 0 && !selectedAccount && (
            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-line-2 bg-panel-2 shadow-raised">
              {accountResults.map((result) => (
                <button
                  key={result.id}
                  className="group flex w-full items-center justify-between px-3 py-2 text-left font-mono text-xs text-ink-2 transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
                  onClick={() => {
                    setSelectedAccount(result);
                    setAccountResults([]);
                    setAccountQuery(result.label);
                  }}
                >
                  <span>{result.label}</span>
                  <Check className="size-3.5 text-signal opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Search */}
        <div className="relative space-y-1.5">
          <label className="font-mono text-2xs tracking-label text-ink-3 uppercase">
            Select user
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <GlassInput
              placeholder="Search by username or email…"
              className="pl-8"
              value={selectedUser ? selectedUser.label : userQuery}
              onChange={(e) => {
                setUserQuery(e.target.value);
                setSelectedUser(null);
              }}
            />
            {isSearchingUser && (
              <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-signal" />
            )}
          </div>
          {/* User Results Dropdown */}
          {userResults.length > 0 && !selectedUser && (
            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-line-2 bg-panel-2 shadow-raised">
              {userResults.map((result) => (
                <button
                  key={result.id}
                  className="group flex w-full items-center justify-between px-3 py-2 text-left font-mono text-xs text-ink-2 transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
                  onClick={() => {
                    setSelectedUser(result);
                    setUserResults([]);
                    setUserQuery(result.label);
                  }}
                >
                  <span>{result.label}</span>
                  <Check className="size-3.5 text-signal opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-line px-3.5 py-2.5">
        <GlassButton
          onClick={handleGrantAccess}
          disabled={!selectedAccount || !selectedUser || isSubmitting}
          variant="primary"
          size="sm"
          className="w-full md:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Granting access…
            </>
          ) : (
            "Grant access"
          )}
        </GlassButton>
      </div>
    </section>
  );
}
