"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Search, ShieldCheck, ShieldOff, CheckCircle2, XCircle,
  RefreshCw, ChevronLeft, ChevronRight, MoreVertical,
  Ban, CircleCheck, Trash2, KeyRound, Eye, EyeOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { confirmDelete, confirmWarning, toastSuccess, toastError } from "@/lib/utils/swal";
import AvatarUpload from "@/components/dashboard/avatar-upload";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

type StatusFilter = "" | "user" | "admin" | "suspended";

export default function AdminUsersManager() {
  const [data,       setData]       = useState<UsersResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [query,      setQuery]      = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [page,       setPage]       = useState(1);
  const [pendingId,  setPendingId]  = useState<string | null>(null);
  const [pwModal,    setPwModal]    = useState<AdminUser | null>(null);
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwError,    setPwError]    = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (statusFilter === "suspended") {
        params.set("status", "suspended");
      } else if (statusFilter === "user" || statusFilter === "admin") {
        params.set("role", statusFilter);
      }
      const res = await fetch(`/api/admin/users?${params}`);
      setData(await res.json());
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter]);

  useEffect(() => { setPage(1); }, [query, statusFilter]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(user: AdminUser, newRole: "user" | "admin") {
    const label = newRole === "admin" ? "Make Admin" : "Remove Admin";
    const text  = newRole === "admin"
      ? `Grant ${user.name} admin privileges?`
      : `Remove admin privileges from ${user.name}?`;
    if (!(await confirmWarning(label, text, "Yes"))) return;

    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed"); return; }
      toastSuccess(`${user.name} is now ${newRole === "admin" ? "an Admin" : "a regular User"}`);
      setData((prev) => prev
        ? { ...prev, users: prev.users.map((u) => u.id === user.id ? { ...u, role: newRole } : u) }
        : prev
      );
    } catch {
      toastError("Request failed");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleSuspend(user: AdminUser) {
    const suspending = !user.isSuspended;
    const ok = await confirmWarning(
      suspending ? "Suspend Account?" : "Reinstate Account?",
      suspending
        ? `${user.name}'s account will be suspended and they won't be able to log in.`
        : `${user.name}'s account will be reinstated and they can log in again.`,
      suspending ? "Yes, Suspend" : "Yes, Reinstate"
    );
    if (!ok) return;

    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: suspending }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed"); return; }
      toastSuccess(suspending ? `${user.name}'s account has been suspended` : `${user.name}'s account has been reinstated`);
      setData((prev) => prev
        ? { ...prev, users: prev.users.map((u) => u.id === user.id ? { ...u, isSuspended: suspending, suspendedAt: suspending ? new Date().toISOString() : null } : u) }
        : prev
      );
    } catch {
      toastError("Request failed");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!(await confirmDelete(user.name))) return;
    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to delete"); return; }
      toastSuccess(`${user.name}'s account has been permanently deleted`);
      setData((prev) => prev
        ? { ...prev, users: prev.users.filter((u) => u.id !== user.id), total: prev.total - 1 }
        : prev
      );
    } catch {
      toastError("Request failed");
    } finally {
      setPendingId(null);
    }
  }

  function openPwModal(user: AdminUser) {
    setPwModal(user);
    setNewPw("");
    setConfirmPw("");
    setShowPw(false);
    setPwError("");
  }

  async function resetPassword() {
    if (!pwModal) return;
    setPwError("");
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${pwModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) { setPwError(json.message ?? "Failed to update password"); return; }
      toastSuccess(`Password updated for ${pwModal.name}`);
      setPwModal(null);
    } catch {
      setPwError("Request failed. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "",          label: "All"       },
    { value: "user",      label: "Users"     },
    { value: "admin",     label: "Admins"    },
    { value: "suspended", label: "Suspended" },
  ];

  const suspendedCount  = data?.users.filter((u) => u.isSuspended).length ?? 0;
  const adminCount      = data?.users.filter((u) => u.role === "admin").length ?? 0;
  const unverifiedCount = data?.users.filter((u) => !u.isEmailVerified).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">
            {data ? `${data.total} total accounts` : "View and manage all accounts"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading} className="rounded-xl">
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 rounded-xl"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                statusFilter === f.value
                  ? f.value === "suspended"
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Total</p>
            <p className="text-2xl font-bold text-indigo-700">{data.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-500 font-semibold">Admins</p>
            <p className="text-2xl font-bold text-emerald-700">{adminCount}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-500 font-semibold">Unverified</p>
            <p className="text-2xl font-bold text-amber-700">{unverifiedCount}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-orange-500 font-semibold">Suspended</p>
            <p className="text-2xl font-bold text-orange-700">{suspendedCount}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-indigo-100/80 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Last login</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto w-6 h-6 animate-spin mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users className="mx-auto w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-slate-500">No users found</p>
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors",
                      user.isSuspended ? "bg-orange-50/40 hover:bg-orange-50" : "hover:bg-indigo-50/40"
                    )}
                  >
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <AvatarUpload
                          entityType="user"
                          entityId={user.id}
                          currentAvatar={user.avatar}
                          name={user.name}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      {user.role === "admin" ? (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 gap-1">
                          <ShieldCheck className="w-3 h-3" />Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 gap-1">
                          <Users className="w-3 h-3" />User
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {user.isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          <Ban className="w-3 h-3" />Suspended
                        </span>
                      ) : user.isEmailVerified ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" />Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <XCircle className="w-4 h-4" />Unverified
                        </span>
                      )}
                    </td>

                    {/* Last login */}
                    <td className="px-5 py-4 text-xs text-slate-400 hidden md:table-cell">
                      {formatDate(user.lastLoginAt)}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-4 text-xs text-slate-400 hidden md:table-cell">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          disabled={pendingId === user.id}
                          className={cn(
                            "inline-flex items-center justify-center h-8 w-8 rounded-xl border border-indigo-100/80 bg-white hover:bg-indigo-50/40 transition-colors",
                            pendingId === user.id && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {pendingId === user.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                            : <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          }
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {/* Role */}
                          {user.role === "user" ? (
                            <DropdownMenuItem
                              onClick={() => changeRole(user, "admin")}
                              className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Make Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => changeRole(user, "user")}
                              className="gap-2"
                            >
                              <ShieldOff className="w-4 h-4" />
                              Remove Admin
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => openPwModal(user)}
                            className="gap-2 text-slate-700 focus:text-slate-700 focus:bg-slate-50"
                          >
                            <KeyRound className="w-4 h-4" />
                            Reset Password
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Suspend / Unsuspend */}
                          {user.isSuspended ? (
                            <DropdownMenuItem
                              onClick={() => toggleSuspend(user)}
                              className="gap-2 text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                            >
                              <CircleCheck className="w-4 h-4" />
                              Reinstate Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => toggleSuspend(user)}
                              className="gap-2 text-orange-700 focus:text-orange-700 focus:bg-orange-50"
                            >
                              <Ban className="w-4 h-4" />
                              Suspend Account
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Delete */}
                          <DropdownMenuItem
                            onClick={() => deleteUser(user)}
                            className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
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

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-indigo-50 bg-slate-50">
            <p className="text-xs text-slate-500">
              Page <span className="font-semibold">{data.page}</span> of{" "}
              <span className="font-semibold">{data.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0"
                disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0"
                disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Reset Password Modal ── */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/60 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <KeyRound className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                    <p className="text-xs text-slate-500">{pwModal.name} &middot; {pwModal.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPwModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">New password</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full h-11 rounded-xl border border-input bg-slate-50 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Confirm new password</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-11 rounded-xl border border-input bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                {pwError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-400 text-white text-[10px] font-bold">!</span>
                    <p className="text-sm text-rose-700">{pwError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPwModal(null)}
                  className="flex-1 h-11 rounded-xl border border-indigo-100 text-sm font-semibold text-slate-700 hover:bg-indigo-50/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={resetPassword}
                  disabled={pwSaving}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 transition-all"
                >
                  {pwSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
