"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  phone: string | null;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersManager() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "user" | "admin">("");
  const [page, setPage] = useState(1);
  const [pendingRole, setPendingRole] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silently handled — table stays as-is
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeRole = async (user: AdminUser, newRole: "user" | "admin") => {
    setPendingRole((p) => ({ ...p, [user.id]: true }));
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ id: user.id, msg: json.message ?? "Failed", ok: false });
        return;
      }
      setFeedback({ id: user.id, msg: `${user.name} is now ${newRole}`, ok: true });
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) =>
                u.id === user.id ? { ...u, role: newRole } : u
              ),
            }
          : prev
      );
    } catch {
      setFeedback({ id: user.id, msg: "Request failed", ok: false });
    } finally {
      setPendingRole((p) => ({ ...p, [user.id]: false }));
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">
            {data ? `${data.total} total users` : "View and manage all accounts"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 rounded-xl"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["", "user", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                roleFilter === r
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {r === "" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Global feedback banner */}
      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            feedback.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-indigo-500">Total</p>
            <p className="text-2xl font-bold text-indigo-700">{data.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-500">Admins</p>
            <p className="text-2xl font-bold text-emerald-700">
              {data.users.filter((u) => u.role === "admin").length}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-500">Unverified</p>
            <p className="text-2xl font-bold text-amber-700">
              {data.users.filter((u) => !u.isEmailVerified).length}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  User
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Email verified
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Last login
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Joined
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <RefreshCw className="mx-auto w-6 h-6 animate-spin mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users className="mx-auto w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500">No users found</p>
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {user.role === "admin" ? (
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">
                          User
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {user.isEmailVerified ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <XCircle className="w-4 h-4" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 hidden md:table-cell">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 hidden md:table-cell">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {user.role === "user" ? (
                        <button
                          onClick={() => changeRole(user, "admin")}
                          disabled={pendingRole[user.id]}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {pendingRole[user.id] ? "Saving…" : "Make Admin"}
                        </button>
                      ) : (
                        <button
                          onClick={() => changeRole(user, "user")}
                          disabled={pendingRole[user.id]}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          {pendingRole[user.id] ? "Saving…" : "Remove Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page <span className="font-semibold">{data.page}</span> of{" "}
              <span className="font-semibold">{data.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-full p-0"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-full p-0"
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
