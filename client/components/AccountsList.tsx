"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { CyberpunkCredentialDisplay } from "./CyberpunkCredentialDisplay";
import { Lock, Eye, EyeOff, Share2 } from "lucide-react";
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
  /** Live expiry of the pushed code; null is the API's "no live code", not "unknown". */
  otpExpiresAt?: string | null;
}

interface Credentials {
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  otp: string;
  /** Shipped by /:id/credentials too; preferred over the roster's copy after a reveal. */
  otpExpiresAt?: string | null;
  hasAccess: boolean;
  accessType: string;
}

interface AccountsListProps {
  onDataChange?: () => void | Promise<void>;
}

// The API answers with this sentinel (never an empty string) whenever a stored code is missing
// or has aged out, so "there is a string here" says nothing about whether a code is usable.
// Both the ledger's CODE READY badge and the readout's LIVE chip ask this instead.
const OTP_PLACEHOLDER = "--:--:--";

const hasLiveCode = (code?: string | null, expiresAt?: string | null) => {
  if (!code || code === OTP_PLACEHOLDER) return false;
  if (!expiresAt) return true; // no recorded expiry: treat the code as usable
  const at = Date.parse(expiresAt);
  return Number.isFinite(at) ? at > Date.now() : true;
};

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
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
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
    (data: { accountTag: string; otp: string; otpExpiresAt?: string }) => {
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

      // The push carries both fields and is authoritative: the server sends the expiry only
      // while the code is live, so falling back to the stored one would pair a fresh code with
      // an old countdown.
      setAccounts((prevAccounts) =>
        prevAccounts.map((account) =>
          account.accountTag === data.accountTag
            ? { ...account, otp: data.otp, otpExpiresAt: data.otpExpiresAt ?? null }
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

  const toggleReveal = (account: OverwatchAccount) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(account.id)) next.delete(account.id);
      else next.add(account.id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
          Loading accounts…
        </span>
      </div>
    );
  }

  const accessible = accounts.filter((a) => a.hasAccess).length;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-panel">
        <header className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
          <h1 className="font-mono text-2xs tracking-label text-ink-2 uppercase">
            Account ledger
          </h1>
          <span className="font-mono text-2xs text-ink-3">
            {accounts.length} in view
          </span>
          <span className="ml-auto hidden font-mono text-2xs tracking-[0.06em] text-ink-3 uppercase sm:inline">
            {accessible} accessible · {accounts.length - accessible} locked
          </span>
        </header>

        {accounts.length === 0 ? (
          <div className="px-3.5 py-14 text-center">
            <Lock size={28} className="mx-auto mb-3 text-ink-3" />
            <p className="font-mono text-xs text-ink-3">
              No Overwatch accounts found in the database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase">
                    Account
                  </th>
                  <th className="hidden px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase sm:table-cell">
                    Owner
                  </th>
                  <th className="hidden px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase md:table-cell">
                    Access
                  </th>
                  <th className="hidden px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase sm:table-cell">
                    Relay
                  </th>
                  <th className="px-3.5 pt-2.5 pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isOpen = revealed.has(account.id);
                  const creds = credentials[account.id];
                  // A code is "ready" when the socket just pushed one, or when the row already
                  // carries a live one. Truthiness is not liveness: the API sends the sentinel
                  // "--:--:--" for a missing or aged-out code, so asking about the expiry is
                  // what actually distinguishes the two.
                  const liveCode = hasLiveCode(
                    creds?.otp ?? account.otp,
                    creds?.otpExpiresAt ?? account.otpExpiresAt,
                  );
                  const relayed = newOtpAccounts.has(account.id) || (account.hasAccess && liveCode);
                  const ownerName = account.owner?.username || "Unknown";

                  return (
                    <FragmentRow
                      key={account.id}
                      account={account}
                      isOpen={isOpen}
                      relayed={relayed}
                      creds={creds}
                      ownerName={ownerName}
                      canShare={
                        account.accessType === "owner" ||
                        (Boolean(user?.role === "admin" || user?.isAdmin) &&
                          account.hasAccess)
                      }
                      onToggleReveal={() => toggleReveal(account)}
                      onFetchCredentials={() => fetchCredentials(account.id)}
                      onShare={() => openShareDialog(account)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

interface FragmentRowProps {
  account: OverwatchAccount;
  isOpen: boolean;
  relayed: boolean;
  creds?: Credentials;
  ownerName: string;
  canShare: boolean;
  onToggleReveal: () => void;
  onFetchCredentials: () => void;
  onShare: () => void;
}

function FragmentRow({
  account,
  isOpen,
  relayed,
  creds,
  ownerName,
  canShare,
  onToggleReveal,
  onFetchCredentials,
  onShare,
}: FragmentRowProps) {
  // The code, its expiry and its liveness all come from ONE source: once the reveal has
  // answered, that response is authoritative — it may legitimately say "no live code" —
  // and mixing it with the roster's copy is exactly what would put a placeholder beside a
  // live countdown.
  const code = creds ? creds.otp : account.otp;
  const codeExpiresAt = creds ? creds.otpExpiresAt : account.otpExpiresAt;
  const codeIsLive = account.hasAccess && hasLiveCode(code, codeExpiresAt);

  return (
    <>
      <tr className="transition-colors duration-150 ease-standard hover:bg-white/[0.025]">
        <td className="border-t border-line px-3.5 py-2.5 align-middle">
          <span className="font-mono text-sm font-medium text-ink">
            {account.accountTag}
          </span>
          <span className="mt-0.5 block font-mono text-2xs tracking-[0.12em] text-ink-3">
            {account.hasAccess ? "password ••••••••••••" : "password •••• locked"}
          </span>
          {account.rank && (
            <span className="mt-0.5 block font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
              {account.rank}
            </span>
          )}
        </td>
        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs text-ink-2 sm:table-cell">
          {ownerName}
        </td>
        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle md:table-cell">
          {account.hasAccess ? (
            <span className="rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ink-2 uppercase">
              {account.accessType === "owner" ? "Owner" : "Shared"}
            </span>
          ) : (
            <span className="rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
              Locked
            </span>
          )}
        </td>
        <td className="hidden border-t border-line px-3.5 py-2.5 align-middle sm:table-cell">
          {relayed ? (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-signal px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-signal-ink uppercase">
              <span className="size-1.5 bg-signal-ink animate-led motion-reduce:animate-none" />
              Code ready
            </span>
          ) : (
            <span className="font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
              Idle
            </span>
          )}
        </td>
        <td className="border-t border-line px-3.5 py-2.5 align-middle">
          <div className="flex flex-none items-center justify-end gap-1.5">
            {account.hasAccess && (
              <button
                onClick={onToggleReveal}
                aria-label={isOpen ? "Hide credentials" : "Reveal credentials"}
                title={isOpen ? "Hide credentials" : "Reveal credentials"}
                className="grid size-[26px] place-items-center rounded-md border border-line-2 text-ink-3 transition-colors duration-150 ease-standard hover:text-ink"
              >
                {isOpen ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
            {account.hasAccess && (creds?.otp || account.otp) && (
              <button
                onClick={onToggleReveal}
                className="rounded-md border border-line-2 px-2 py-1 font-mono text-2xs tracking-[0.06em] whitespace-nowrap text-ink-2 uppercase transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
              >
                {isOpen ? "Hide code" : "Show code"}
              </button>
            )}
            {canShare && (
              <button
                onClick={onShare}
                className="rounded-md border border-line-2 px-2 py-1 font-mono text-2xs tracking-[0.06em] whitespace-nowrap text-ink-2 uppercase transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Share2 size={12} />
                  Share
                </span>
              </button>
            )}
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-panel-2">
          <td colSpan={5} className="border-t border-line px-3.5 py-3">
            <div className="grid gap-2.5 lg:grid-cols-3">
              <CyberpunkCredentialDisplay
                label="Battle.net email"
                value={creds?.accountEmail || account.accountEmail}
                isEncrypted={!account.hasAccess}
                hasAccess={account.hasAccess}
                onDecrypt={onFetchCredentials}
              />
              <CyberpunkCredentialDisplay
                label="Password"
                value={creds?.accountPassword || account.accountPassword}
                isEncrypted={!account.hasAccess}
                hasAccess={account.hasAccess}
                onDecrypt={onFetchCredentials}
              />
              <CyberpunkCredentialDisplay
                label="Login code"
                variant="readout"
                expiresAt={codeExpiresAt}
                live={codeIsLive}
                value={code || (account.hasAccess ? "—" : "CIPHER::OTP::LOCKED")}
                isEncrypted={!account.hasAccess}
                hasAccess={account.hasAccess}
                onDecrypt={onFetchCredentials}
              />
            </div>
            {account.mainHeroes && account.mainHeroes.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Mains
                </span>
                {account.mainHeroes.map((hero) => (
                  <span
                    key={hero}
                    className="rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs text-ink-2"
                  >
                    {hero}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
