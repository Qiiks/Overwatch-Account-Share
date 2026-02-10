"use client";

import { useState, useEffect } from "react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { apiGet, apiPatch, apiDelete, apiPost } from "@/lib/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // We might need to create this if it doesn't exist or use standard table
import {
  MoreVertical,
  Shield,
  ShieldAlert,
  UserX,
  CheckCircle2,
  XCircle,
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
  createdat: string;
}

interface UserManagementProps {
  onUsersChange: () => void;
}

export function UserManagement({ onUsersChange }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Assuming the API supports pagination and search
      // Adjust endpoint if necessary based on server implementation
      const data = await apiGet<{ users: User[]; totalPages: number }>(
        `/api/admin/users?page=${page}&limit=10&search=${search}`,
      );
      setUsers(data.users);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load user list");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = currentStatus ? "suspended" : "active";
      await apiPatch(`/api/admin/users/${userId}/status`, {
        status: newStatus,
      });
      toast.success(
        `User ${newStatus === "active" ? "activated" : "suspended"}`,
      );
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"; // Simple toggle for now
    try {
      await apiPatch(`/api/admin/users/${userId}/role`, {
        role: newRole,
      });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;

    try {
      await apiDelete(`/api/admin/users/${userId}`);
      toast.success("User deleted");
      fetchUsers();
      onUsersChange();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiPost("/api/admin/users", newUser);
      toast.success("User created successfully");
      setIsCreateOpen(false);
      setNewUser({ username: "", email: "", password: "" });
      fetchUsers();
      onUsersChange();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <GlassCard>
      <GlassCardContent className="p-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              className="w-full bg-[#0a0a0a]/50 border border-white/10 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#8A2BE2]/50 transition-colors"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <GlassButton className="w-full md:w-auto flex items-center gap-2 bg-[#8A2BE2]/20 hover:bg-[#8A2BE2]/30 text-[#DA70D6] border-[#8A2BE2]/30">
                <Plus className="w-4 h-4" /> Add User
              </GlassButton>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0a0a] border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They will receive an email to
                  verify their account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white"
                    required
                    minLength={6}
                  />
                </div>
                <DialogFooter>
                  <GlassButton
                    type="submit"
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      "Create Account"
                    )}
                  </GlassButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/5 text-gray-400">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">
                          {user.username}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isadmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#8A2BE2]/20 text-[#DA70D6] text-xs">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-gray-400">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isapproved ? (
                        <span className="inline-flex items-center gap-1 text-[#00ff88]">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.createdat).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1a1a1a] border-white/10 text-gray-300"
                        >
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(user.id, user.isapproved)
                            }
                            className={
                              user.isapproved
                                ? "text-yellow-500 focus:text-yellow-500"
                                : "text-[#00ff88] focus:text-[#00ff88]"
                            }
                          >
                            {user.isapproved ? (
                              <>
                                <ShieldAlert className="w-4 h-4 mr-2" /> Suspend
                                User
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                Activate User
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
                            <Shield className="w-4 h-4 mr-2" />
                            {user.isadmin ? "Revoke Admin" : "Make Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.id)}
                            className="text-red-500 focus:text-red-500 hover:bg-red-500/10"
                          >
                            <UserX className="w-4 h-4 mr-2" /> Delete Account
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
        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          <GlassButton
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            variant="ghost"
            className="text-xs"
          >
            Previous
          </GlassButton>
          <span className="flex items-center px-2 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <GlassButton
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            variant="ghost"
            className="text-xs"
          >
            Next
          </GlassButton>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
