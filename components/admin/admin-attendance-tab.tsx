"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  UserCheck, Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  Pencil, Trash2, Clock, CheckCircle2, XCircle, AlertCircle,
  CalendarDays, Users, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmDelete } from "@/lib/utils/swal";

type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave";
type StaffType = "driver" | "employee";

type AttendanceRecord = {
  id: string; staffId: string; staffType: StaffType;
  staffName: string; staffSub: string;
  date: string; status: AttendanceStatus;
  checkIn: string | null; checkOut: string | null;
  notes: string | null; createdAt: string;
};

type StaffOption = { id: string; name: string; department?: string };

type TodaySummary = Record<AttendanceStatus, number>;

const STATUS_CFG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  present:  { label: "Present",  color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-300",  icon: CheckCircle2 },
  absent:   { label: "Absent",   color: "text-red-700",     bg: "bg-red-100 border border-red-300",          icon: XCircle      },
  late:     { label: "Late",     color: "text-amber-700",   bg: "bg-amber-100 border border-amber-300",      icon: Clock        },
  half_day: { label: "Half Day", color: "text-blue-700",    bg: "bg-blue-100 border border-blue-300",        icon: AlertCircle  },
  on_leave: { label: "On Leave", color: "text-purple-700",  bg: "bg-purple-100 border border-purple-300",    icon: CalendarDays },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
      <Icon className="size-3" />{cfg.label}
    </span>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAttendanceTab() {
  const [records, setRecords]       = useState<AttendanceRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({ present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 });
  const [drivers, setDrivers]       = useState<StaffOption[]>([]);
  const [employees, setEmployees]   = useState<StaffOption[]>([]);
  const [loading, setLoading]       = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterDate, setFilterDate]           = useState(todayStr());
  const [filterStaffType, setFilterStaffType] = useState("");
  const [filterStatus, setFilterStatus]       = useState("");

  // Dialog
  const [dlgOpen, setDlgOpen]   = useState(false);
  const [editRec, setEditRec]   = useState<AttendanceRecord | null>(null);
  const [form, setForm]         = useState({ staffId: "", staffType: "driver" as StaffType, date: todayStr(), status: "present" as AttendanceStatus, checkIn: "", checkOut: "", notes: "" });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (filterDate)      q.set("date", filterDate);
    if (filterStaffType) q.set("staffType", filterStaffType);
    if (filterStatus)    q.set("status", filterStatus);
    const res = await window.fetch(`/api/admin/attendance?${q}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTodaySummary(data.todaySummary);
      setDrivers(data.drivers);
      setEmployees(data.employees);
    }
    setLoading(false);
  }, [filterDate, filterStaffType, filterStatus]);

  useEffect(() => { startTransition(() => { fetch(1); }); }, [fetch]);

  function openAdd() {
    setEditRec(null);
    setForm({ staffId: "", staffType: "driver", date: todayStr(), status: "present", checkIn: "", checkOut: "", notes: "" });
    setError("");
    setDlgOpen(true);
  }

  function openEdit(r: AttendanceRecord) {
    setEditRec(r);
    setForm({ staffId: r.staffId, staffType: r.staffType, date: r.date.slice(0, 10), status: r.status, checkIn: r.checkIn ?? "", checkOut: r.checkOut ?? "", notes: r.notes ?? "" });
    setError("");
    setDlgOpen(true);
  }

  async function handleSave() {
    if (!form.staffId) { setError("Please select a staff member."); return; }
    setSaving(true); setError("");
    try {
      let res: Response;
      if (editRec) {
        res = await window.fetch(`/api/admin/attendance/${editRec.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: form.status, checkIn: form.checkIn, checkOut: form.checkOut, notes: form.notes }),
        });
      } else {
        res = await window.fetch("/api/admin/attendance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Failed."); return; }
      setDlgOpen(false);
      fetch(page);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirmDelete(`Delete attendance record for ${name}?`);
    if (!ok) return;
    await window.fetch(`/api/admin/attendance/${id}`, { method: "DELETE" });
    fetch(page);
  }

  const staffOptions = form.staffType === "driver" ? drivers : employees;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="size-5 text-indigo-600" /> Staff Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Track daily clock-in / clock-out for drivers and employees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetch(page)} disabled={loading}>
            <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openAdd}>
            <Plus className="size-4 mr-1.5" /> Record Attendance
          </Button>
        </div>
      </div>

      {/* Today summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.entries(STATUS_CFG) as [AttendanceStatus, typeof STATUS_CFG[AttendanceStatus]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("size-4", cfg.color)} />
                <span className="text-xs text-slate-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{todaySummary[key] ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Today</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500">Date</Label>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-8 text-sm w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500">Staff Type</Label>
          <select value={filterStaffType} onChange={e => setFilterStaffType(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">All</option>
            <option value="driver">Drivers</option>
            <option value="employee">Employees</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500">Status</Label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">All</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button size="sm" variant="outline" onClick={() => { setFilterDate(""); setFilterStaffType(""); setFilterStatus(""); }}>
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <span className="text-sm font-medium text-slate-700">{total} record{total !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Staff", "Type", "Date", "Status", "Check In", "Check Out", "Notes", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No records found.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.staffName}</p>
                    <p className="text-xs text-slate-400">{r.staffSub}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      r.staffType === "driver" ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-sky-100 text-sky-700 border border-sky-200")}>
                      <Users className="size-3" />{r.staffType === "driver" ? "Driver" : "Employee"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.checkIn ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.checkOut ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{r.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="icon" variant="ghost" className="size-7 hover:bg-indigo-50" onClick={() => openEdit(r)}>
                        <Pencil className="size-3.5 text-indigo-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 hover:bg-red-50" onClick={() => handleDelete(r.id, r.staffName)}>
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetch(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => fetch(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRec ? "Edit Attendance" : "Record Attendance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editRec && (
              <>
                <div className="space-y-1.5">
                  <Label>Staff Type</Label>
                  <select value={form.staffType} onChange={e => setForm(f => ({ ...f, staffType: e.target.value as StaffType, staffId: "" }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="driver">Driver</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Staff Member</Label>
                  <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    {staffOptions.map(s => <option key={s.id} value={s.id}>{s.name}{s.department ? ` — ${s.department}` : ""}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AttendanceStatus }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Check In</Label>
                <Input type="time" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Check Out</Label>
                <Input type="time" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
