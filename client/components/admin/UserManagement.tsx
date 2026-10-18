"use client";

import { useState, useEffect } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { ConfirmationDialog } from "@/components/admin/ConfirmationDialog";
import { apiGet, apiPatch, apiDelete, apiPost } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  MoreVertical,
  Shield,
  ShieldAlert,
  UserX,
  CheckCircle2,
  Loader2,
  Search,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isadmin: boolean;
  isapproved: boolean;
  last_login: string | null;
  createdat: string | null;
}

interface UserManagementProps {
  onUsersChange: () => void;
}

const PAGE_SIZE = 10;

export function UserManagement({ onUsersChange }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Create User State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // The endpoint returns the full list; search and paging happen here.
      const data = await apiGet<{ users: User[] }>("/admin/users");
      setUsers(data.users ?? []);
    } catch (error) {
      toast.error("Failed to load user list", {
        description: errorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredUsers = term
    ? users.filter(
        (user) =>
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      )
    : users;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = currentStatus ? "suspended" : "active";
      await apiPatch(`/admin/users/${userId}/status`, {
        status: newStatus,
      });
      toast.success(
        `User ${newStatus === "active" ? "activated" : "suspended"}`,
      );
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to update status", {
        description: errorMessage(error),
      });
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"; // Simple toggle for now
    try {
      await apiPatch(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to update role", {
        description: errorMessage(error),
      });
    }
  };

  const handleDelete = async (user: User) => {
    setUserToDelete(null);
    try {
      await apiDelete(`/admin/users/${user.id}`);
      toast.success("User deleted");
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to delete user", {
        description: errorMessage(error),
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiPost("/admin/users", newUser);
      toast.success("User created successfully");
      setIsCreateOpen(false);
      setNewUser({ username: "", email: "", password: "" });
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to create user"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-panel">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line px-3.5 py-2.5 md:flex-row md:items-center">
        <div className="relative w-full md:w-64">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
          <input
            className="h-8 w-full rounded-md border border-line-2 bg-ground pl-8 pr-2.5 font-mono text-xs text-ink placeholder:text-ink-3 focus-visible:border-signal focus-visible:outline-none"
            placeholder="Search users…"
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="font-mono text-2xs tracking-[0.06em] text-ink-3 uppercase md:ml-auto">
          {filteredUsers.length} records
        </span>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <GlassButton
              variant="primary"
              size="sm"
              className="w-full md:w-auto"
            >
              <Plus className="size-3.5" /> Add user
            </GlassButton>
          </DialogTrigger>
          <DialogContent className="border-line-2 bg-panel-2 text-ink sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-2xs tracking-label text-ink-2 uppercase">
                Create new user
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-3">
                Add a new user to the system. They will receive an email to
                verify their account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-3.5 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Username
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  className="border-line-2 bg-ground text-ink"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="border-line-2 bg-ground text-ink"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="border-line-2 bg-ground text-ink"
                  required
                  minLength={6}
                />
              </div>
              <DialogFooter>
                <GlassButton type="submit" variant="primary" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Create account"
                  )}
                </GlassButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>User</Th>
              <Th className="hidden sm:table-cell">Role</Th>
              <Th>Status</Th>
              <Th className="hidden sm:table-cell">Joined</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-10 text-center">
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin text-ink-3" />
                  <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                    Loading users…
                  </span>
                </td>
              </tr>
            ) : pageUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border-t border-line px-3.5 py-10 text-center font-mono text-xs text-ink-3"
                >
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors duration-150 ease-standard hover:bg-white/[0.025]"
                >
                  <td className="border-t border-line px-3.5 py-2.5 align-middle">
                    <span className="block font-mono text-sm font-medium text-ink">
                      {user.username}
                    </span>
                    <span className="block font-mono text-2xs text-ink-3">
                      {user.email}
                    </span>
                  </td>
                  <td className="hidden border-t border-line px-3.5 py-2.5 align-middle sm:table-cell">
                    {user.isadmin ? (
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ink-2 uppercase">
                        <Shield className="size-3" /> Admin
                      </span>
                    ) : (
                      <span className="font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
                        User
                      </span>
                    )}
                  </td>
                  <td className="border-t border-line px-3.5 py-2.5 align-middle">
                    {user.isapproved ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-2xs tracking-[0.08em] text-ink-2 uppercase">
                        <span className="size-1.5 bg-signal" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-mono text-2xs tracking-[0.08em] text-alarm uppercase">
                        <span className="size-1.5 bg-alarm" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="hidden border-t border-line px-3.5 py-2.5 align-middle font-mono text-xs tabular-nums text-ink-2 sm:table-cell">
                    {user.createdat
                      ? new Date(user.createdat).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="border-t border-line px-3.5 py-2.5 text-right align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Actions for ${user.username}`}
                          className="grid size-[26px] place-items-center rounded-md border border-line-2 text-ink-3 transition-colors duration-150 ease-standard hover:text-ink"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-line-2 bg-panel-2 text-ink-2"
                      >
                        <DropdownMenuLabel className="font-mono text-2xs tracking-label text-ink-3 uppercase">
                          Actions
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(user.id, user.isapproved)
                          }
                          className={
                            user.isapproved
                              ? "text-warn focus:text-warn"
                              : "text-signal focus:text-signal"
                          }
                        >
                          {user.isapproved ? (
                            <>
                              <ShieldAlert className="mr-2 size-4" /> Suspend user
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 size-4" /> Activate user
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              user.id,
                              user.isadmin ? "admin" : "user",
                            )
                          }
                        >
                          <Shield className="mr-2 size-4" />
                          {user.isadmin ? "Revoke admin" : "Make admin"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-line" />
                        <DropdownMenuItem
                          onClick={() => setUserToDelete(user)}
                          className="text-alarm hover:bg-alarm/10 focus:text-alarm"
                        >
                          <UserX className="mr-2 size-4" /> Delete account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Simple Implementation */}
      <div className="flex items-center justify-end gap-2 border-t border-line px-3.5 py-2.5">
        <GlassButton
          disabled={currentPage <= 1 || loading}
          onClick={() => setPage(currentPage - 1)}
          variant="ghost"
          size="sm"
        >
          Previous
        </GlassButton>
        <span className="font-mono text-2xs tabular-nums text-ink-3">
          Page {currentPage} of {totalPages}
        </span>
        <GlassButton
          disabled={currentPage >= totalPages || loading}
          onClick={() => setPage(currentPage + 1)}
          variant="ghost"
          size="sm"
        >
          Next
        </GlassButton>
      </div>

      <ConfirmationDialog
        open={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDelete(userToDelete)}
        title="Delete user?"
        description={`${
          userToDelete?.username ?? "This user"
        } will be permanently deleted. Are you sure? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </section>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3.5 pt-2.5 pb-1.5 text-left font-mono text-2xs font-medium tracking-label text-ink-3 uppercase ${className}`}
    >
      {children}
    </th>
  );
}
