"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassButton } from "@/components/ui/GlassButton";
import { Search, Loader2 } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "sonner";

interface ShareAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountTag: string;
  /** Users the account is currently shared with (owner view). Omit to hide the revoke list. */
  sharedWith?: { id: string; email: string }[];
  onShareSuccess?: () => void | Promise<void>;
}

interface ShareUser {
  id: string;
  username: string;
  email: string;
}

export function ShareAccountDialog({
  isOpen,
  onClose,
  accountId,
  accountTag,
  sharedWith,
  onShareSuccess,
}: ShareAccountDialogProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ShareUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null); // userId being shared with
  const [revoking, setRevoking] = useState<string | null>(null); // userId being revoked

  // Fetch users when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const fetched = await apiGet<ShareUser[] | { users: ShareUser[] }>(
            "/api/overwatch-accounts/users",
          );
          const list = Array.isArray(fetched) ? fetched : fetched?.users ?? [];
          setUsers(list);
          setFilteredUsers(list);
        } catch (error) {
          toast.error(errorMessage(error, "Failed to load users list"));
        } finally {
          setLoading(false);
        }
      };

      fetchUsers();
    } else {
      // Reset state when closed
      setQuery("");
      setSharing(null);
      setRevoking(null);
    }
  }, [isOpen]);

  // Filter users based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery),
    );
    setFilteredUsers(filtered);
  }, [query, users]);

  const handleShare = async (user: ShareUser) => {
    setSharing(user.id);
    try {
      await apiPost(`/overwatch-accounts/${accountId}/share-by-email`, {
        email: user.email,
      });

      toast.success(`Account shared with ${user.username}`);
      await onShareSuccess?.();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to share"));
    } finally {
      setSharing(null);
    }
  };

  const handleRevoke = async (user: { id: string; email: string }) => {
    setRevoking(user.id);
    try {
      const remainingIds = (sharedWith ?? [])
        .filter((shared) => shared.id !== user.id)
        .map((shared) => shared.id);

      await apiPut(`/overwatch-accounts/${accountId}/access`, {
        userIds: remainingIds,
      });

      toast.success(`Access revoked for ${user.email}`);
      await onShareSuccess?.();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to revoke access"));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-line-2 bg-panel-2 text-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xs tracking-label text-ink-2 uppercase">
            Share access
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-3">
            Share <span className="font-mono text-ink">{accountTag}</span> with
            other users.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <GlassInput
              placeholder="Search users by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto border-t border-line">
            {loading ? (
              <div className="flex justify-center py-8 text-ink-3">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 border-b border-line px-1 py-2.5 last:border-b-0"
                >
                  <span className="grid size-7 flex-none place-items-center rounded-md border border-line-2 font-mono text-2xs text-ink-2">
                    {user.username.substring(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-ink">
                      {user.username}
                    </span>
                    <span className="block truncate font-mono text-2xs text-ink-3">
                      {user.email}
                    </span>
                  </span>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare(user)}
                    disabled={!!sharing}
                    className="ml-auto flex-none"
                  >
                    {sharing === user.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Share"
                    )}
                  </GlassButton>
                </div>
              ))
            ) : (
              <p className="py-8 text-center font-mono text-xs text-ink-3">
                No users found.
              </p>
            )}
          </div>

          {/* Currently shared with */}
          {sharedWith && sharedWith.length > 0 && (
            <div className="space-y-1.5 border-t border-line pt-3">
              <p className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                Currently shared with
              </p>
              {sharedWith.map((shared) => (
                <div
                  key={shared.id}
                  className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
                >
                  <span className="grid size-7 flex-none place-items-center rounded-md border border-line-2 font-mono text-2xs text-ink-2">
                    {shared.email.substring(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-ink-2">
                    {shared.email}
                  </span>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(shared)}
                    disabled={!!revoking}
                    className="ml-auto flex-none border-alarm/50 text-alarm hover:bg-alarm/10 hover:text-alarm"
                  >
                    {revoking === shared.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Revoke"
                    )}
                  </GlassButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
