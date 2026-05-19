"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_ROLES } from "@/lib/permissions";
import type { UserRole } from "@/models/User";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "banned" | "suspended";
  banReason: string | null;
  isEmailVerified: boolean;
  bookingCount: number;
  lastLoginAt: string | null;
  createdAt: string;
  referralCode: string | null;
};

type DetailData = {
  user: UserRow & { phone: string | null };
  bookings: { id: string; status: string; totalPrice: number; seats: string[]; createdAt: string }[];
  loyalty: { tier: string; points: number; lifetimePoints: number } | null;
};

const STATUS_COLORS: Record<string, string> = {
  active:    "border-emerald-200 bg-emerald-50 text-emerald-700",
  banned:    "border-red-200 bg-red-50 text-red-700",
  suspended: "border-amber-200 bg-amber-50 text-amber-700",
};

// ─── Create User Form ──────────────────────────────────────────────────────────
function CreateUserForm({ onCreated }: { onCreated: (user: UserRow) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "user" as UserRole });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoGen, setAutoGen] = useState(false);

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, password: pw }));
    setAutoGen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.user);
        setForm({ name: "", email: "", password: "", phone: "", role: "user" });
        setAutoGen(false);
        setOpen(false);
      } else {
        setError(data.message ?? "Failed to create user.");
      }
    } catch {
      setError("Unable to create user right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm px-4"
        onClick={() => setOpen(true)}
      >
        + Add User
      </Button>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/40 shadow-lg">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base text-indigo-900">Create New User</CardTitle>
        <button
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          onClick={() => { setOpen(false); setError(""); }}
        >
          ×
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Full name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Jane Doe"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="jane@example.com"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+855 ..."
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Role *</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-slate-500">Password *</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={form.password}
                onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setAutoGen(false); }}
                required
                placeholder="Min 6 characters"
                className={`h-10 flex-1 rounded-xl font-mono ${autoGen ? "bg-emerald-50 border-emerald-200" : ""}`}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 text-xs px-3 shrink-0"
                onClick={generatePassword}
              >
                Auto-generate
              </Button>
            </div>
            {autoGen && (
              <p className="text-xs text-emerald-700">
                Generated password — copy it before saving: <span className="font-mono font-bold">{form.password}</span>
              </p>
            )}
          </div>

          {/* Role description */}
          {form.role && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${ALL_ROLES.find(r => r.value === form.role)?.color ?? ""}`}>
              <span className="font-semibold capitalize">{form.role}</span>: {ALL_ROLES.find(r => r.value === form.role)?.description}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 text-sm"
            >
              {loading ? "Creating…" : "Create user"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => { setOpen(false); setError(""); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
  const r = ALL_ROLES.find((x) => x.value === role);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${r?.color ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {r?.label ?? role}
    </span>
  );
}

// ─── Role Selector ─────────────────────────────────────────────────────────────
function RoleSelector({ userId, current, onChanged, disabled }: {
  userId: string;
  current: UserRole;
  onChanged: (newRole: UserRole) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function pick(role: UserRole) {
    if (role === current) { setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) onChanged(data.user.role);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setOpen(false); }
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
      >
        <RoleBadge role={current} />
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl">
          {ALL_ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => pick(r.value)}
              className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl ${r.value === current ? "bg-indigo-50" : ""}`}
            >
              <span className={`mt-0.5 rounded-full border px-1.5 py-0.5 font-medium shrink-0 ${r.color}`}>{r.label}</span>
              <span className="text-slate-500 leading-tight">{r.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ──────────────────────────────────────────────────────────────────
export default function AdminUsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showBanInput, setShowBanInput] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, role: roleFilter, status: statusFilter });
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => { setUsers(data.users ?? []); setTotal(data.total ?? 0); setPages(data.pages ?? 1); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleStatusChange(userId: string, status: string, reason?: string) {
    setActing(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data.user } : u));
        if (detail?.user.id === userId) setDetail((d) => d ? { ...d, user: { ...d.user, ...data.user } } : d);
      }
    } catch (e) { console.error(e); }
    finally { setActing(null); setShowBanInput(null); setBanReason(""); }
  }

  async function openDetail(userId: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">{total} total users</p>
        </div>
        <CreateUserForm
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map((r) => (
          <span key={r.value} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${r.color}`}>
            <span className="font-semibold">{r.label}</span>
            <span className="opacity-70">— {r.description}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 w-52 rounded-xl text-sm"
        />
        <div className="flex gap-1">
          {(["all", "user", "support", "driver", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${roleFilter === r ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {r === "all" ? "All roles" : r}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "active", "suspended", "banned"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-slate-800 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {s === "all" ? "All status" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* User list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 text-gray-500"><p className="text-3xl mb-3">👤</p><p className="font-medium">No users found</p></CardContent></Card>
          ) : (
            users.map((user) => (
              <Card
                key={user.id}
                className={`border-gray-200 transition-all cursor-pointer hover:shadow-md ${detail?.user.id === user.id ? "ring-2 ring-indigo-400" : ""}`}
                onClick={() => openDetail(user.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        {/* Role selector */}
                        <RoleSelector
                          userId={user.id}
                          current={user.role}
                          disabled={acting === user.id}
                          onChanged={(newRole) =>
                            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u))
                          }
                        />
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[user.status]}`}>
                          {user.status}
                        </span>
                        {!user.isEmailVerified && <span className="text-xs text-amber-600">Unverified</span>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>{user.bookingCount} booking{user.bookingCount !== 1 ? "s" : ""}</span>
                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        {user.lastLoginAt && <span>Last login {new Date(user.lastLoginAt).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    {/* Status actions */}
                    <div className="flex shrink-0 flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {user.status === "active" ? (
                        <>
                          <Button size="sm" variant="outline" disabled={acting === user.id}
                            className="h-7 rounded-full px-2.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleStatusChange(user.id, "suspended", "Admin suspended")}>
                            Suspend
                          </Button>
                          {showBanInput === user.id ? (
                            <div className="flex gap-1">
                              <Input autoFocus value={banReason} onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Reason…" className="h-7 w-28 rounded-lg text-xs px-2" />
                              <Button size="sm" disabled={acting === user.id}
                                className="h-7 rounded-full px-2 text-xs bg-red-600 hover:bg-red-700"
                                onClick={() => handleStatusChange(user.id, "banned", banReason || "Admin ban")}>
                                Ban
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline"
                              className="h-7 rounded-full px-2.5 text-xs border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => setShowBanInput(user.id)}>
                              Ban
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button size="sm" variant="outline" disabled={acting === user.id}
                          className="h-7 rounded-full px-2.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleStatusChange(user.id, "active")}>
                          Reinstate
                        </Button>
                      )}
                    </div>
                  </div>

                  {user.banReason && user.status !== "active" && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">Reason: {user.banReason}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full">Previous</Button>
              <span className="text-sm text-gray-600">{page} / {pages}</span>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded-full">Next</Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {detailLoading ? (
            <Card className="border-gray-200"><CardContent className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></CardContent></Card>
          ) : detail ? (
            <Card className="border-indigo-200 bg-indigo-50/50 sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{detail.user.name}</CardTitle>
                  <button className="text-gray-400 hover:text-gray-600 text-lg" onClick={() => setDetail(null)}>×</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <InfoRow label="Email" value={detail.user.email} />
                  {detail.user.phone && <InfoRow label="Phone" value={detail.user.phone} />}
                  <InfoRow label="Role" value={<RoleBadge role={detail.user.role} />} />
                  <InfoRow label="Status" value={<span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[detail.user.status]}`}>{detail.user.status}</span>} />
                  <InfoRow label="Verified" value={detail.user.isEmailVerified ? "✓ Yes" : "✗ No"} />
                  <InfoRow label="Joined" value={new Date(detail.user.createdAt).toLocaleDateString()} />
                  {detail.user.lastLoginAt && <InfoRow label="Last login" value={new Date(detail.user.lastLoginAt).toLocaleDateString()} />}
                  {detail.user.referralCode && <InfoRow label="Referral" value={<span className="font-mono">{detail.user.referralCode}</span>} />}
                </div>

                {detail.loyalty && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Loyalty</p>
                    <div className="flex gap-4 text-xs text-amber-700">
                      <span className="capitalize font-medium">{detail.loyalty.tier}</span>
                      <span>{detail.loyalty.points} pts</span>
                      <span>{detail.loyalty.lifetimePoints} lifetime</span>
                    </div>
                  </div>
                )}

                {detail.bookings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent bookings</p>
                    {detail.bookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{b.seats.length} seat{b.seats.length !== 1 ? "s" : ""}</p>
                          <p className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">${b.totalPrice}</p>
                          <span className={`text-xs ${b.status === "confirmed" ? "text-emerald-600" : b.status === "cancelled" ? "text-red-500" : "text-gray-500"}`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <p className="text-2xl mb-2">👆</p>
                <p className="text-sm">Click a user to see their profile</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
