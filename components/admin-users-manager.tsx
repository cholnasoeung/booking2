"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Search, ShieldCheck, ShieldOff, CheckCircle2, XCircle,
  RefreshCw, ChevronLeft, ChevronRight, MoreVertical,
  Ban, CircleCheck, Trash2, AlertTriangle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone: string | null;
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
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function changeRole(user: AdminUser, newRole: "user" | "admin") {
    setPendingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) { showFeedback(json.message ?? "Failed", false); return; }
      showFeedback(`${user.name} is now ${newRole === "admin" ? "an Admin" : "a regular User"}`, true);
      setData((prev) => prev
        ? { ...prev, users: prev.users.map((u) => u.id === user.id ? { ...u, role: newRole } : u) }
        : prev
      );
    } catch {
      showFeedback("Request failed", false);
    } finally {
      setPendingId(null);
    }
  }

  async function toggleSuspend(user: AdminUser) {
    setPendingId(user.id);
    const nextSuspended = !user.isSuspended;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: nextSuspended }),
      });
      const json = await res.json();
      if (!res.ok) { showFeedback(json.message ?? "Failed", false); return; }
      showFeedback(
        nextSuspended ? `${user.name}'s account has been suspended` : `${user.name}'s account has been reinstated`,
        true
      );
      setData((prev) => prev
        ? { ...prev, users: prev.users.map((u) => u.id === user.id ? { ...u, isSuspended: nextSuspended } : u) }
        : prev
      );
    } catch {
      showFeedback("Request failed", false);
    } finally {
      setPendingId(null);
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showFeedback(json.message ?? "Failed to delete", false); return; }
      showFeedback(`${deleteTarget.name}'s account has been permanently deleted`, true);
      setData((prev) => prev
        ? { ...prev, users: prev.users.filter((u) => u.id !== deleteTarget.id), total: prev.total - 1 }
        : prev
      );
      setDeleteTarget(null);
    } catch {
      showFeedback("Request failed", false);
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "", label: "All" },
    { value: "user", label: "Users" },
    { value: "admin", label: "Admins" },
    { value: "suspended", label: "Suspended" },
  ];

  const suspendedCount = data?.users.filter((u) => u.isSuspended).length ?? 0;
  const adminCount = data?.users.filter((u) => u.role === "admin").length ?? 0;
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

      {/* Feedback banner */}
      {feedback && (
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between",
          feedback.ok
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-red-50 border border-red-200 text-red-700"
        )}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="ml-4 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900">Delete "{deleteTarget.name}"?</p>
              <p className="text-sm text-red-700 mt-0.5">
                This will permanently remove the account and all associated data. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-100"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              onClick={deleteUser}
              disabled={deleting}
            >
              {deleting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />Deleting…</> : "Yes, Delete"}
            </Button>
          </div>
        </div>
      )}

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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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
            <tbody className="divide-y divide-slate-100">
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
                      user.isSuspended ? "bg-orange-50/40 hover:bg-orange-50" : "hover:bg-slate-50"
                    )}
                  >
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold",
                          user.isSuspended
                            ? "bg-gradient-to-br from-orange-400 to-red-500"
                            : "bg-gradient-to-br from-indigo-400 to-purple-500"
                        )}>
                          {user.isSuspended ? <Ban className="w-4 h-4" /> : user.name.charAt(0).toUpperCase()}
                        </div>
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
                            "inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors",
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
                            onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
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
    </div>
  );
}
