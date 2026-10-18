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
import { Search, User, Share2, Loader2, X } from "lucide-react";
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
      <DialogContent className="sm:max-w-md bg-black/80 backdrop-blur-xl border-purple-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-400 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Access
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Share <span className="text-white font-medium">{accountTag}</span>{" "}
            with other users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <GlassInput
              placeholder="Search users by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 border-purple-500/30 focus:border-purple-400 bg-purple-900/10"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8 text-purple-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0">
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-gray-200">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare(user)}
                    disabled={!!sharing}
                    className="h-8 px-3 text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                  >
                    {sharing === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Share"
                    )}
                  </GlassButton>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No users found.
              </div>
            )}
          </div>

          {/* Currently shared with */}
          {sharedWith && sharedWith.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-purple-500/20">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Currently shared with
              </p>
              {sharedWith.map((shared) => (
                <div
                  key={shared.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-purple-500/10 bg-purple-500/5"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <p className="text-sm truncate text-gray-200">
                      {shared.email}
                    </p>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRevoke(shared)}
                    disabled={!!revoking}
                    className="h-8 px-3"
                  >
                    {revoking === shared.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Revoke
                      </>
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
