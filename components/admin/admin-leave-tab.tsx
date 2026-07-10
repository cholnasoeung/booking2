"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  CalendarOff, Plus, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Trash2, Users, Calendar, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmDelete } from "@/lib/utils/swal";

type LeaveType   = "annual" | "sick" | "emergency" | "unpaid" | "maternity" | "other";
type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
type StaffType   = "driver" | "employee";

type LeaveRecord = {
  id: string; staffId: string; staffType: StaffType;
  staffName: string; staffSub: string;
  leaveType: LeaveType; startDate: string; endDate: string;
  days: number; reason: string; status: LeaveStatus;
  adminNote: string | null; reviewedAt: string | null; createdAt: string;
};

type StaffOption = { id: string; name: string; department?: string };

const LEAVE_TYPES: Record<LeaveType, string> = {
  annual: "Annual", sick: "Sick", emergency: "Emergency",
  unpaid: "Unpaid", maternity: "Maternity", other: "Other",
};

const STATUS_CFG: Record<LeaveStatus, { label: string; color: string; bg: string; bar: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "text-amber-700",   bg: "bg-amber-100 border border-amber-300",   bar: "bg-amber-400",   icon: Clock        },
  approved:  { label: "Approved",  color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-300", bar: "bg-emerald-500", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "text-red-700",     bg: "bg-red-100 border border-red-300",       bar: "bg-red-400",     icon: XCircle      },
  cancelled: { label: "Cancelled", color: "text-slate-600",   bg: "bg-slate-100 border border-slate-300",   bar: "bg-slate-300",   icon: XCircle      },
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  annual: "bg-indigo-400", sick: "bg-rose-400", emergency: "bg-orange-400",
  unpaid: "bg-slate-400", maternity: "bg-pink-400", other: "bg-teal-400",
};

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
      <Icon className="size-3" />{cfg.label}
    </span>
  );
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function getLeavesForDay(records: LeaveRecord[], iso: string): LeaveRecord[] {
  return records.filter((r) => {
    const start = r.startDate.slice(0, 10);
    const end   = r.endDate.slice(0, 10);
    return iso >= start && iso <= end;
  });
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminLeaveTab() {
  const [records, setRecords]       = useState<LeaveRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary]       = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [drivers, setDrivers]       = useState<StaffOption[]>([]);
  const [employees, setEmployees]   = useState<StaffOption[]>([]);
  const [loading, setLoading]       = useState(false);
  const [, startTransition]         = useTransition();
  const [viewMode, setViewMode]     = useState<"list" | "calendar">("calendar");

  // Calendar state
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // All records for calendar (no pagination filter)
  const [allRecords, setAllRecords] = useState<LeaveRecord[]>([]);

  // Filters
  const [filterStatus,    setFilterStatus]    = useState("pending");
  const [filterStaffType, setFilterStaffType] = useState("");

  // Add dialog
  const [addOpen,   setAddOpen]   = useState(false);
  const [form,      setForm]      = useState({ staffId: "", staffType: "driver" as StaffType, leaveType: "annual" as LeaveType, startDate: "", endDate: "", reason: "" });
  const [addErr,    setAddErr]    = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Review dialog
  const [reviewOpen,   setReviewOpen]   = useState(false);
  const [reviewRec,    setReviewRec]    = useState<LeaveRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState<LeaveStatus>("approved");
  const [reviewNote,   setReviewNote]   = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: "200" }); // fetch more for calendar
    if (filterStatus)    q.set("status", filterStatus);
    if (filterStaffType) q.set("staffType", filterStaffType);
    const res = await window.fetch(`/api/admin/leave-requests?${q}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.requests);
      setAllRecords(data.requests);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
      setDrivers(data.drivers);
      setEmployees(data.employees);
    }
    setLoading(false);
  }, [filterStatus, filterStaffType]);

  // Fetch all records for calendar (no status filter)
  const fetchAll = useCallback(async () => {
    const res = await window.fetch(`/api/admin/leave-requests?limit=500`);
    if (res.ok) {
      const data = await res.json();
      setAllRecords(data.requests);
    }
  }, []);

  useEffect(() => { startTransition(() => { fetchData(1); fetchAll(); }); }, [fetchData, fetchAll]);

  async function handleAdd() {
    if (!form.staffId || !form.startDate || !form.endDate || !form.reason.trim()) {
      setAddErr("All fields are required."); return;
    }
    setAddSaving(true); setAddErr("");
    const res = await window.fetch("/api/admin/leave-requests", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setAddErr(d.message ?? "Failed."); setAddSaving(false); return; }
    setAddOpen(false); fetchData(page); fetchAll();
    setAddSaving(false);
  }

  function openReview(r: LeaveRecord) {
    setReviewRec(r); setReviewStatus("approved"); setReviewNote(""); setReviewOpen(true);
  }

  async function handleReview() {
    if (!reviewRec) return;
    setReviewSaving(true);
    const res = await window.fetch(`/api/admin/leave-requests/${reviewRec.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reviewStatus, adminNote: reviewNote }),
    });
    if (res.ok) { setReviewOpen(false); fetchData(page); fetchAll(); }
    setReviewSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirmDelete(`Delete leave request for ${name}?`);
    if (!ok) return;
    await window.fetch(`/api/admin/leave-requests/${id}`, { method: "DELETE" });
    fetchData(page); fetchAll();
  }

  const staffOptions = form.staffType === "driver" ? drivers : employees;

  // Calendar grid
  const daysInMonth    = getDaysInMonth(calYear, calMonth);
  const firstDayOfWeek = getFirstDayOfWeek(calYear, calMonth);
  const totalCells     = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  }

  const selectedDayLeaves = selectedDay ? getLeavesForDay(allRecords, selectedDay) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarOff className="size-5 text-rose-500" /> Leave Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Review and manage leave requests with calendar view.</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
            <button onClick={() => setViewMode("calendar")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "calendar" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-700")}>
              <Calendar className="size-3.5" /> Calendar
            </button>
            <button onClick={() => setViewMode("list")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-700")}>
              <List className="size-3.5" /> List
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading}>
            <RefreshCw className={cn("size-4 mr-1", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => { setForm({ staffId: "", staffType: "driver", leaveType: "annual", startDate: "", endDate: "", reason: "" }); setAddErr(""); setAddOpen(true); }}>
            <Plus className="size-4 mr-1" /> New Request
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [LeaveStatus, typeof STATUS_CFG[LeaveStatus]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => { setFilterStatus(key); setViewMode("list"); }}
              className={cn("rounded-xl border bg-white p-3 shadow-sm text-left transition-all hover:shadow-md",
                filterStatus === key && viewMode === "list" && "ring-2 ring-rose-400")}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("size-4", cfg.color)} />
                <span className="text-xs text-slate-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{(summary as any)[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === "calendar" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Calendar grid */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <button onClick={prevMonth}
                className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft className="size-4 text-slate-600" />
              </button>
              <h3 className="text-sm font-bold text-slate-800">
                {MONTHS[calMonth]} {calYear}
              </h3>
              <button onClick={nextMonth}
                className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronRight className="size-4 text-slate-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDayOfWeek + 1;
                const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                const iso = isValid
                  ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                  : "";
                const dayLeaves = iso ? getLeavesForDay(allRecords, iso) : [];
                const isToday   = iso === toISO(new Date());
                const isSelected = iso === selectedDay;
                const MAX_BARS  = 3;

                return (
                  <div
                    key={i}
                    onClick={() => isValid && setSelectedDay(isSelected ? null : iso)}
                    className={cn(
                      "min-h-[72px] border-b border-r border-slate-100 p-1.5 transition-colors",
                      isValid ? "cursor-pointer hover:bg-indigo-50/40" : "bg-slate-50/50",
                      isSelected && "bg-indigo-50 ring-2 ring-inset ring-indigo-400",
                      !isValid && "opacity-40"
                    )}
                  >
                    {isValid && (
                      <>
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1",
                          isToday ? "bg-indigo-600 text-white" : "text-slate-700"
                        )}>
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayLeaves.slice(0, MAX_BARS).map((r) => (
                            <div key={r.id}
                              className={cn(
                                "h-1.5 rounded-full w-full",
                                STATUS_CFG[r.status].bar
                              )}
                              title={`${r.staffName} — ${LEAVE_TYPES[r.leaveType]}`}
                            />
                          ))}
                          {dayLeaves.length > MAX_BARS && (
                            <p className="text-[9px] text-slate-400 font-medium pl-0.5">
                              +{dayLeaves.length - MAX_BARS} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              {(Object.entries(STATUS_CFG) as [LeaveStatus, typeof STATUS_CFG[LeaveStatus]][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-5 rounded-full", cfg.bar)} />
                  <span className="text-[11px] text-slate-500">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-rose-50/30">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedDay
                  ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                  : "Select a day"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDay
                  ? selectedDayLeaves.length === 0
                    ? "No leave on this day"
                    : `${selectedDayLeaves.length} staff on leave`
                  : "Click a day to see who's on leave"}
              </p>
            </div>

            <div className="p-3 space-y-2 max-h-[480px] overflow-y-auto">
              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                  <Calendar className="size-10 mb-2" />
                  <p className="text-xs text-slate-400 text-center">Click any day on the calendar</p>
                </div>
              ) : selectedDayLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                  <CheckCircle2 className="size-10 mb-2 text-emerald-300" />
                  <p className="text-xs text-emerald-500 text-center font-medium">All staff present</p>
                </div>
              ) : (
                selectedDayLeaves.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{r.staffName}</p>
                        <p className="text-[11px] text-slate-400">{r.staffSub}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className={cn("rounded-full px-2 py-0.5 font-medium",
                        r.staffType === "driver" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>
                        {r.staffType === "driver" ? "Driver" : "Employee"}
                      </span>
                      <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 font-medium">
                        {LEAVE_TYPES[r.leaveType]}
                      </span>
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium">
                        {r.days} day{r.days > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{r.reason}</p>
                    {r.status === "pending" && (
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => openReview(r)}
                          className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold py-1 hover:bg-emerald-100 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => { setReviewRec(r); setReviewStatus("rejected"); setReviewNote(""); setReviewOpen(true); }}
                          className="flex-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold py-1 hover:bg-red-100 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500">Status</Label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
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
            <div className="flex items-end">
              <Button size="sm" variant="outline" onClick={() => { setFilterStatus(""); setFilterStaffType(""); }}>Clear</Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <span className="text-sm font-medium text-slate-700">{total} request{total !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Staff","Type","Leave Type","Period","Days","Reason","Status",""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No leave requests found.</td></tr>
                  ) : records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.staffName}</p>
                        <p className="text-xs text-slate-400">{r.staffSub}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          r.staffType === "driver" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>
                          <Users className="size-3" />{r.staffType === "driver" ? "Driver" : "Employee"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{LEAVE_TYPES[r.leaveType]}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {fmt(r.startDate)} – {fmt(r.endDate)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{r.days}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{r.reason}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {r.status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openReview(r)}>
                              Review
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-7 hover:bg-red-50"
                            onClick={() => handleDelete(r.id, r.staffName)}>
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchData(page - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>Leave Type</Label>
              <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value as LeaveType }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            {form.startDate && form.endDate && form.endDate >= form.startDate && (
              <p className="text-xs text-indigo-600 font-medium bg-indigo-50 rounded-lg px-3 py-2">
                📅 {Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1} day(s) of leave
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} placeholder="Reason for leave…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            {addErr && <p className="text-sm text-red-600">{addErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addSaving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {addSaving ? "Saving…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Review Leave Request</DialogTitle></DialogHeader>
          {reviewRec && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm space-y-1.5">
                <p><span className="font-semibold text-slate-700">Staff:</span> <span className="text-slate-600">{reviewRec.staffName}</span></p>
                <p><span className="font-semibold text-slate-700">Type:</span> <span className="text-slate-600">{LEAVE_TYPES[reviewRec.leaveType]}</span></p>
                <p><span className="font-semibold text-slate-700">Period:</span> <span className="text-slate-600">{fmt(reviewRec.startDate)} – {fmt(reviewRec.endDate)} ({reviewRec.days} day{reviewRec.days > 1 ? "s" : ""})</span></p>
                <p><span className="font-semibold text-slate-700">Reason:</span> <span className="text-slate-600">{reviewRec.reason}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label>Decision</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setReviewStatus("approved")}
                    className={cn("rounded-xl border py-2 text-sm font-semibold transition-all",
                      reviewStatus === "approved"
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md"
                        : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700")}>
                    ✓ Approve
                  </button>
                  <button onClick={() => setReviewStatus("rejected")}
                    className={cn("rounded-xl border py-2 text-sm font-semibold transition-all",
                      reviewStatus === "rejected"
                        ? "bg-red-500 border-red-500 text-white shadow-md"
                        : "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600")}>
                    ✕ Reject
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Admin Note (optional)</Label>
                <Input placeholder="Add a note for the staff member…" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={reviewSaving}
              className={cn(reviewStatus === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700", "text-white")}>
              {reviewSaving ? "Saving…" : reviewStatus === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
