"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  Banknote, Play, CheckCircle, DollarSign, MoreHorizontal,
  Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Clock, Users, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete, toastSuccess, toastError } from "@/lib/utils/swal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PayrollRec = {
  id: string; employeeId: string; employeeName: string;
  employeeRole: string; employeeDept: string; month: string;
  baseSalary: number; totalAllowances: number;
  deductionTax: number; deductionInsurance: number; deductionAdvance: number; deductionLeave: number; deductionOther: number;
  totalDeductions: number; bonus: number; grossPay: number; netPay: number;
  status: string; paidAt: string | null; notes: string | null;
};

type Summary = {
  totalGross: number; totalNet: number; totalBonus: number;
  countDraft: number; countApproved: number; countPaid: number; total: number;
};

type MonthlyPoint = { month: string; label: string; totalNet: number; count: number };

type DedForm = {
  deductionTax: string; deductionInsurance: string;
  deductionAdvance: string; deductionLeave: string; deductionOther: string;
  bonus: string; notes: string;
};

type LeaveSuggestion = { days: number; amount: number };

const ROLE_COLORS: Record<string, string> = {
  driver: "text-cyan-400", mechanic: "text-orange-400", ticket_agent: "text-blue-400",
  manager: "text-violet-400", accountant: "text-emerald-400", other: "text-slate-400",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "text-slate-100",   bg: "bg-slate-600/60  border border-slate-500/60"   },
  approved: { label: "Approved", color: "text-blue-100",    bg: "bg-blue-600/50   border border-blue-400/60"    },
  paid:     { label: "Paid",     color: "text-emerald-100", bg: "bg-emerald-600/50 border border-emerald-400/60" },
};

const fmt = (n: number) => `$${n.toLocaleString()}`;

const emptyDedForm: DedForm = {
  deductionTax: "0", deductionInsurance: "0", deductionAdvance: "0", deductionLeave: "0", deductionOther: "0",
  bonus: "0", notes: "",
};

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function AdminPayrollTab() {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [month,     setMonth]     = useState(todayMonth);
  const [records,   setRecords]   = useState<PayrollRec[]>([]);
  const [summary,   setSummary]   = useState<Summary>({ totalGross: 0, totalNet: 0, totalBonus: 0, countDraft: 0, countApproved: 0, countPaid: 0, total: 0 });
  const [monthly,   setMonthly]   = useState<MonthlyPoint[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editOpen,  setEditOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<PayrollRec | null>(null);
  const [dedForm,   setDedForm]   = useState<DedForm>(emptyDedForm);
  const [formErr,   setFormErr]   = useState("");
  const [leaveSuggestion, setLeaveSuggestion] = useState<LeaveSuggestion | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/payroll?month=${month}`);
      const data = await res.json();
      setRecords(data.records   ?? []);
      setSummary(data.summary   ?? {});
      setMonthly(data.monthly   ?? []);
    } catch {} finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = () => {
    startTransition(async () => {
      const res  = await fetch("/api/admin/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month }) });
      const data = await res.json();
      if (res.ok) { toastSuccess(data.message); fetchData(); }
      else        { toastError(data.message); }
    });
  };

  const openEdit = (rec: PayrollRec) => {
    setEditTarget(rec);
    setDedForm({
      deductionTax:       String(rec.deductionTax),
      deductionInsurance: String(rec.deductionInsurance),
      deductionAdvance:   String(rec.deductionAdvance),
      deductionLeave:     String(rec.deductionLeave),
      deductionOther:     String(rec.deductionOther),
      bonus:              String(rec.bonus),
      notes:              rec.notes ?? "",
    });
    setFormErr(""); setEditOpen(true);
    setLeaveSuggestion(null);
    fetch(`/api/admin/payroll/leave-preview?employeeId=${rec.employeeId}&month=${rec.month}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setLeaveSuggestion(data); })
      .catch(() => {});
  };

  const applyLeaveSuggestion = () => {
    if (!leaveSuggestion) return;
    setDedForm((p) => ({ ...p, deductionLeave: String(leaveSuggestion.amount) }));
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/payroll/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductionTax:       Number(dedForm.deductionTax),
          deductionInsurance: Number(dedForm.deductionInsurance),
          deductionAdvance:   Number(dedForm.deductionAdvance),
          deductionLeave:     Number(dedForm.deductionLeave),
          deductionOther:     Number(dedForm.deductionOther),
          bonus:              Number(dedForm.bonus),
          notes:              dedForm.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setFormErr(d.message ?? "Error"); return; }
      setEditOpen(false); fetchData();
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      await fetch(`/api/admin/payroll/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      fetchData();
    });
  };

  const handleDelete = async (rec: PayrollRec) => {
    if (!(await confirmDelete("this payroll record"))) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/payroll/${rec.id}`, { method: "DELETE" });
      if (res.ok) { toastSuccess("Payroll record deleted."); fetchData(); }
      else { toastError("Failed to delete."); }
    });
  };

  // Live deduction preview
  const liveDed = editTarget
    ? (Number(dedForm.deductionTax) || 0) + (Number(dedForm.deductionInsurance) || 0) + (Number(dedForm.deductionAdvance) || 0) + (Number(dedForm.deductionLeave) || 0) + (Number(dedForm.deductionOther) || 0)
    : 0;
  const liveBonus  = Number(dedForm.bonus)  || 0;
  const liveGross  = editTarget ? (editTarget.baseSalary + editTarget.totalAllowances + liveBonus) : 0;
  const liveNet    = liveGross - liveDed;

  const setD = (key: keyof DedForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDedForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
            <Banknote className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payroll</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{monthLabel(month)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month nav */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-sm p-1">
            <button onClick={() => setMonth(prevMonth(month))} className="flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white text-sm px-2 focus:outline-none"
            />
            <button onClick={() => setMonth(nextMonth(month))} disabled={month >= todayMonth} className="flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-30">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button onClick={() => fetchData()} className="flex items-center justify-center size-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors">
            <RefreshCw className="size-4" />
          </button>

          <Button onClick={handleGenerate} disabled={isPending} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 gap-2 font-semibold">
            <Play className="size-4" /> Generate Payroll
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-lg shadow-indigo-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Users className="size-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Employees</span>
            </div>
            <div className="text-4xl font-black text-white mb-3">{summary.total}</div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white font-medium">{summary.countDraft} draft</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-400/30 text-blue-100 font-medium">{summary.countApproved} approved</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-medium">{summary.countPaid} paid</span>
            </div>
          </div>
        </div>

        {/* Gross Payroll */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-lg shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="size-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Gross Payroll</span>
            </div>
            <div className="text-2xl font-black text-white font-mono mb-3">{fmt(summary.totalGross)}</div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-300 to-indigo-300" />
            </div>
          </div>
        </div>

        {/* Net Payroll */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Banknote className="size-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Net Payroll</span>
            </div>
            <div className="text-2xl font-black text-white font-mono mb-3">{fmt(summary.totalNet)}</div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-300" />
            </div>
          </div>
        </div>

        {/* Total Bonuses */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <TrendingUp className="size-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Total Bonuses</span>
            </div>
            <div className="text-2xl font-black text-white font-mono mb-3">{fmt(summary.totalBonus)}</div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-200 to-orange-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {monthly.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-sm">
              <TrendingUp className="size-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Monthly Net Payroll Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#f1f5f9", fontSize: 12 }}
                cursor={{ fill: "rgba(16,185,129,0.06)" }}
                formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, "Net Pay"]}
              />
              <Bar dataKey="totalNet" name="Net Pay" fill="url(#payrollGradient)" radius={[8, 8, 0, 0]} maxBarSize={48} />
              <defs>
                <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse">Loading payroll…</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/30 py-20 text-center">
          <div className="flex h-14 w-14 mx-auto mb-4 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
            <DollarSign className="size-7 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No payroll records for {monthLabel(month)}.</p>
          <p className="text-sm mt-1.5 text-slate-400">Click "Generate Payroll" to create draft records for all active employees.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-x-auto shadow-sm bg-white dark:bg-slate-800/40">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-800 to-slate-900">
                {["Employee","Base","Allowances","Deductions","Bonus","Gross","Net Pay","Status",""].map((h, i) => (
                  <th key={i} className="px-4 py-4 text-left text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {records.map((rec) => {
                const status = STATUS_MAP[rec.status] ?? STATUS_MAP.draft;
                const roleColor = ROLE_COLORS[rec.employeeRole] ?? "text-slate-400";
                const initials = rec.employeeName.split(" ").map((p: string) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20">
                          {initials}
                        </div>
                        <div>
                          <p className="text-slate-800 dark:text-white font-semibold">{rec.employeeName}</p>
                          <p className={cn("text-[11px] capitalize font-medium", roleColor)}>{rec.employeeRole.replace("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono text-sm font-medium">{fmt(rec.baseSalary)}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-sm">{fmt(rec.totalAllowances)}</td>
                    <td className="px-4 py-3.5">
                      {rec.totalDeductions > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-mono text-sm font-semibold">
                          -{fmt(rec.totalDeductions)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {rec.bonus > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400 font-mono text-sm font-semibold">
                          +{fmt(rec.bonus)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-white font-mono text-sm font-semibold">{fmt(rec.grossPay)}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">{fmt(rec.netPay)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold", status.bg, status.color)}>{status.label}</span>
                      {rec.paidAt && <p className="text-[10px] text-slate-400 mt-1">{new Date(rec.paidAt).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 w-48 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(rec)} className="gap-2 cursor-pointer">
                            <Pencil className="size-3.5" /> Edit Deductions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/8" />
                          {rec.status === "draft"    && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "approved")} className="gap-2 cursor-pointer text-blue-500 dark:text-blue-400"><CheckCircle className="size-3.5" /> Approve</DropdownMenuItem>}
                          {rec.status === "approved" && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "paid")}     className="gap-2 cursor-pointer text-emerald-500 dark:text-emerald-400"><Banknote className="size-3.5" /> Mark as Paid</DropdownMenuItem>}
                          {rec.status === "paid"     && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "draft")}    className="gap-2 cursor-pointer"><Clock className="size-3.5" /> Revert to Draft</DropdownMenuItem>}
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/8" />
                          <DropdownMenuItem onClick={() => handleDelete(rec)} className="gap-2 cursor-pointer text-red-500 dark:text-red-400">
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Deductions Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                <Pencil className="size-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base">Edit Deductions & Bonus</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">{editTarget?.employeeName} — {monthLabel(month)}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editTarget && (
            <div className="space-y-4">
              {/* Read-only summary */}
              <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/3 p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Base Salary</p>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">{fmt(editTarget.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Allowances</p>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">{fmt(editTarget.totalAllowances)}</p>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">Deductions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Tax ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionTax} onChange={setD("deductionTax")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Insurance ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionInsurance} onChange={setD("deductionInsurance")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Advance ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionAdvance} onChange={setD("deductionAdvance")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Other ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionOther} onChange={setD("deductionOther")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-slate-600 dark:text-slate-300 text-xs">Unpaid Leave ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionLeave} onChange={setD("deductionLeave")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
                    {leaveSuggestion && (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          {leaveSuggestion.days > 0
                            ? `${leaveSuggestion.days} approved unpaid day${leaveSuggestion.days !== 1 ? "s" : ""} this month → suggested ${fmt(leaveSuggestion.amount)} (base ÷ 26/day)`
                            : "No approved unpaid leave found for this month."}
                        </span>
                        {leaveSuggestion.days > 0 && (
                          <button
                            type="button"
                            onClick={applyLeaveSuggestion}
                            className="shrink-0 font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Use
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bonus */}
              <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4 space-y-2">
                <h4 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Bonus</h4>
                <Input type="number" min="0" value={dedForm.bonus} onChange={setD("bonus")} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white" />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-slate-600 dark:text-slate-300 text-xs">Notes (optional)</Label>
                <textarea value={dedForm.notes} onChange={setD("notes")} rows={2} placeholder="Add remarks..." className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>

              {/* Live net preview */}
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 p-4 text-center shadow-lg shadow-indigo-500/20">
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Gross</p>
                  <p className="text-base font-black text-white font-mono">{fmt(liveGross)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Deductions</p>
                  <p className="text-base font-black text-red-300 font-mono">-{fmt(liveDed)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Net Pay</p>
                  <p className="text-base font-black text-emerald-300 font-mono">{fmt(liveNet)}</p>
                </div>
              </div>
            </div>
          )}

          {formErr && <p className="text-sm text-red-500">{formErr}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">Cancel</Button>
            <Button onClick={handleEditSave} disabled={isPending} className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
