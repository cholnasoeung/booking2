"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  CalendarOff, Plus, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Pencil, Trash2, Users,
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
  annual: "Annual Leave", sick: "Sick Leave", emergency: "Emergency",
  unpaid: "Unpaid Leave", maternity: "Maternity", other: "Other",
};

const STATUS_CFG: Record<LeaveStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "text-amber-700",   bg: "bg-amber-100 border border-amber-300",   icon: Clock        },
  approved:  { label: "Approved",  color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-300", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "text-red-700",     bg: "bg-red-100 border border-red-300",       icon: XCircle      },
  cancelled: { label: "Cancelled", color: "text-slate-600",   bg: "bg-slate-100 border border-slate-300",   icon: XCircle      },
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

  // Filters
  const [filterStatus, setFilterStatus]       = useState("pending");
  const [filterStaffType, setFilterStaffType] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm]       = useState({ staffId: "", staffType: "driver" as StaffType, leaveType: "annual" as LeaveType, startDate: "", endDate: "", reason: "" });
  const [addErr, setAddErr]   = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Review dialog
  const [reviewOpen, setReviewOpen]   = useState(false);
  const [reviewRec, setReviewRec]     = useState<LeaveRecord | null>(null);
  const [reviewStatus, setReviewStatus] = useState<LeaveStatus>("approved");
  const [reviewNote, setReviewNote]   = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p) });
    if (filterStatus)    q.set("status", filterStatus);
    if (filterStaffType) q.set("staffType", filterStaffType);
    const res = await window.fetch(`/api/admin/leave-requests?${q}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.requests);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
      setDrivers(data.drivers);
      setEmployees(data.employees);
    }
    setLoading(false);
  }, [filterStatus, filterStaffType]);

  useEffect(() => { startTransition(() => { fetch(1); }); }, [fetch]);

  async function handleAdd() {
    if (!form.staffId || !form.startDate || !form.endDate || !form.reason.trim()) {
      setAddErr("All fields are required."); return;
    }
    setAddSaving(true); setAddErr("");
    const res = await window.fetch("/api/admin/leave-requests", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setAddErr(d.message ?? "Failed."); setAddSaving(false); return; }
    setAddOpen(false); fetch(page);
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
    if (res.ok) { setReviewOpen(false); fetch(page); }
    setReviewSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirmDelete(`Delete leave request for ${name}?`);
    if (!ok) return;
    await window.fetch(`/api/admin/leave-requests/${id}`, { method: "DELETE" });
    fetch(page);
  }

  const staffOptions = form.staffType === "driver" ? drivers : employees;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarOff className="size-5 text-rose-600" /> Leave &amp; Holiday Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve leave requests for drivers and employees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetch(page)} disabled={loading}>
            <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => { setForm({ staffId: "", staffType: "driver", leaveType: "annual", startDate: "", endDate: "", reason: "" }); setAddErr(""); setAddOpen(true); }}>
            <Plus className="size-4 mr-1.5" /> New Request
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(STATUS_CFG) as [LeaveStatus, typeof STATUS_CFG[LeaveStatus]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={cn("rounded-xl border bg-white p-3 shadow-sm text-left transition-all hover:shadow-md", filterStatus === key && "ring-2 ring-rose-400")}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("size-4", cfg.color)} />
                <span className="text-xs text-slate-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{(summary as any)[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

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
                {["Staff", "Type", "Leave Type", "Period", "Days", "Reason", "Status", ""].map(h => (
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
              <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
                <p><span className="font-medium">Staff:</span> {reviewRec.staffName}</p>
                <p><span className="font-medium">Type:</span> {LEAVE_TYPES[reviewRec.leaveType]}</p>
                <p><span className="font-medium">Period:</span> {fmt(reviewRec.startDate)} – {fmt(reviewRec.endDate)} ({reviewRec.days} day{reviewRec.days > 1 ? "s" : ""})</p>
                <p><span className="font-medium">Reason:</span> {reviewRec.reason}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Decision</Label>
                <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value as LeaveStatus)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Admin Note (optional)</Label>
                <Input placeholder="Add a note…" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
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
