"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  Banknote, Play, CheckCircle, DollarSign, MoreHorizontal,
  Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Clock,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PayrollRec = {
  id: string; employeeId: string; employeeName: string;
  employeeRole: string; employeeDept: string; month: string;
  baseSalary: number; totalAllowances: number;
  deductionTax: number; deductionInsurance: number; deductionAdvance: number; deductionOther: number;
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
  deductionAdvance: string; deductionOther: string;
  bonus: string; notes: string;
};

const ROLE_COLORS: Record<string, string> = {
  driver: "text-cyan-400", mechanic: "text-orange-400", ticket_agent: "text-blue-400",
  manager: "text-purple-400", accountant: "text-green-400", other: "text-slate-400",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "Draft",    color: "text-slate-400",   bg: "bg-slate-500/15   border border-slate-500/30"   },
  approved: { label: "Approved", color: "text-blue-400",    bg: "bg-blue-500/15    border border-blue-500/30"    },
  paid:     { label: "Paid",     color: "text-emerald-400", bg: "bg-emerald-500/15 border border-emerald-500/30" },
};

const fmt = (n: number) => `$${n.toLocaleString()}`;

const emptyDedForm: DedForm = {
  deductionTax: "0", deductionInsurance: "0", deductionAdvance: "0", deductionOther: "0",
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
  const [genMsg,    setGenMsg]     = useState("");
  const [genErr,    setGenErr]     = useState("");
  const [editOpen,  setEditOpen]   = useState(false);
  const [deleteOpen,setDeleteOpen] = useState(false);
  const [editTarget,   setEditTarget]   = useState<PayrollRec | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollRec | null>(null);
  const [dedForm,   setDedForm]   = useState<DedForm>(emptyDedForm);
  const [formErr,   setFormErr]   = useState("");
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
    setGenMsg(""); setGenErr("");
    startTransition(async () => {
      const res  = await fetch("/api/admin/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month }) });
      const data = await res.json();
      if (res.ok) { setGenMsg(data.message); fetchData(); }
      else        { setGenErr(data.message); }
    });
  };

  const openEdit = (rec: PayrollRec) => {
    setEditTarget(rec);
    setDedForm({
      deductionTax:       String(rec.deductionTax),
      deductionInsurance: String(rec.deductionInsurance),
      deductionAdvance:   String(rec.deductionAdvance),
      deductionOther:     String(rec.deductionOther),
      bonus:              String(rec.bonus),
      notes:              rec.notes ?? "",
    });
    setFormErr(""); setEditOpen(true);
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

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await fetch(`/api/admin/payroll/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteOpen(false); fetchData();
    });
  };

  // Live deduction preview
  const liveDed = editTarget
    ? (Number(dedForm.deductionTax) || 0) + (Number(dedForm.deductionInsurance) || 0) + (Number(dedForm.deductionAdvance) || 0) + (Number(dedForm.deductionOther) || 0)
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20">
            <Banknote className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Payroll</h2>
            <p className="text-xs text-slate-400">{monthLabel(month)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Month nav */}
          <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-slate-800/60 p-1">
            <button onClick={() => setMonth(prevMonth(month))} className="flex items-center justify-center size-7 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="size-4" />
            </button>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent text-white text-sm px-2 focus:outline-none"
            />
            <button onClick={() => setMonth(nextMonth(month))} disabled={month >= todayMonth} className="flex items-center justify-center size-7 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors disabled:opacity-30">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <Button onClick={() => fetchData()} variant="ghost" size="sm" className="text-slate-400 hover:text-white border border-white/8">
            <RefreshCw className="size-4" />
          </Button>

          <Button onClick={handleGenerate} disabled={isPending} className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg gap-2">
            <Play className="size-4" /> Generate Payroll
          </Button>
        </div>
      </div>

      {/* Generate feedback */}
      {genMsg && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{genMsg}</div>}
      {genErr && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{genErr}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/8 bg-slate-800/60 p-4">
          <div className="text-xs text-slate-400 mb-1">Total Employees</div>
          <div className="text-3xl font-black text-white">{summary.total}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            <span className="text-slate-400">{summary.countDraft} draft</span>
            <span>·</span>
            <span className="text-blue-400">{summary.countApproved} approved</span>
            <span>·</span>
            <span className="text-emerald-400">{summary.countPaid} paid</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-800/60 p-4">
          <div className="text-xs text-slate-400 mb-1">Gross Payroll</div>
          <div className="text-2xl font-black text-white font-mono">{fmt(summary.totalGross)}</div>
          <div className="mt-2 h-1 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-800/60 p-4">
          <div className="text-xs text-slate-400 mb-1">Net Payroll</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{fmt(summary.totalNet)}</div>
          <div className="mt-2 h-1 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />
        </div>
        <div className="rounded-2xl border border-white/8 bg-slate-800/60 p-4">
          <div className="text-xs text-slate-400 mb-1">Total Bonuses</div>
          <div className="text-2xl font-black text-amber-400 font-mono">{fmt(summary.totalBonus)}</div>
          <div className="mt-2 h-1 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </div>

      {/* Chart */}
      {monthly.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-slate-800/60 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Monthly Net Payroll Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#f1f5f9", fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Net Pay"]} />
              <Bar dataKey="totalNet" name="Net Pay" fill="url(#payrollGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <defs>
                <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#0891b2" />
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
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-slate-400">
          <DollarSign className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">No payroll records for {monthLabel(month)}.</p>
          <p className="text-xs mt-1">Click "Generate Payroll" to create draft records for all active employees.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-white/8 bg-slate-800/40">
                {["Employee","Base","Allowances","Deductions","Bonus","Gross","Net Pay","Status",""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((rec) => {
                const status = STATUS_MAP[rec.status] ?? STATUS_MAP.draft;
                const roleColor = ROLE_COLORS[rec.employeeRole] ?? "text-slate-400";
                const initials = rec.employeeName.split(" ").map((p: string) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={rec.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/25 to-violet-500/25 text-white text-xs font-bold">
                          {initials}
                        </div>
                        <div>
                          <p className="text-white font-medium">{rec.employeeName}</p>
                          <p className={cn("text-[11px] capitalize", roleColor)}>{rec.employeeRole.replace("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-sm">{fmt(rec.baseSalary)}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-sm">
                      {fmt(rec.totalAllowances)}
                    </td>
                    <td className="px-4 py-3">
                      {rec.totalDeductions > 0 ? (
                        <p className="text-red-400 font-mono text-sm">-{fmt(rec.totalDeductions)}</p>
                      ) : (
                        <p className="text-slate-500 text-sm">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rec.bonus > 0 ? (
                        <p className="text-amber-400 font-mono text-sm">+{fmt(rec.bonus)}</p>
                      ) : (
                        <p className="text-slate-500 text-sm">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-mono text-sm">{fmt(rec.grossPay)}</td>
                    <td className="px-4 py-3">
                      <p className="text-emerald-400 font-mono font-semibold">{fmt(rec.netPay)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", status.bg, status.color)}>{status.label}</span>
                      {rec.paidAt && <p className="text-[10px] text-slate-500 mt-0.5">{new Date(rec.paidAt).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition-colors">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-slate-200 w-48">
                          <DropdownMenuItem onClick={() => openEdit(rec)} className="gap-2 cursor-pointer">
                            <Pencil className="size-3.5" /> Edit Deductions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/8" />
                          {rec.status === "draft"    && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "approved")} className="gap-2 cursor-pointer text-blue-400"><CheckCircle className="size-3.5" /> Approve</DropdownMenuItem>}
                          {rec.status === "approved" && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "paid")}     className="gap-2 cursor-pointer text-emerald-400"><Banknote className="size-3.5" /> Mark as Paid</DropdownMenuItem>}
                          {rec.status === "paid"     && <DropdownMenuItem onClick={() => handleStatusChange(rec.id, "draft")}    className="gap-2 cursor-pointer text-slate-300"><Clock className="size-3.5" /> Revert to Draft</DropdownMenuItem>}
                          <DropdownMenuSeparator className="bg-white/8" />
                          <DropdownMenuItem onClick={() => { setDeleteTarget(rec); setDeleteOpen(true); }} className="gap-2 cursor-pointer text-red-400">
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
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Deductions & Bonus</DialogTitle>
            <DialogDescription className="text-slate-400">{editTarget?.employeeName} — {monthLabel(month)}</DialogDescription>
          </DialogHeader>

          {editTarget && (
            <div className="space-y-5">
              {/* Read-only summary */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Base Salary</p>
                  <p className="text-white font-mono font-semibold">{fmt(editTarget.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Allowances</p>
                  <p className="text-white font-mono font-semibold">{fmt(editTarget.totalAllowances)}</p>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deductions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Tax ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionTax} onChange={setD("deductionTax")} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Insurance ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionInsurance} onChange={setD("deductionInsurance")} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Advance ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionAdvance} onChange={setD("deductionAdvance")} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Other ($)</Label>
                    <Input type="number" min="0" value={dedForm.deductionOther} onChange={setD("deductionOther")} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
              </div>

              {/* Bonus */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Bonus ($)</Label>
                <Input type="number" min="0" value={dedForm.bonus} onChange={setD("bonus")} className="bg-white/5 border-white/10 text-white" />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Notes</Label>
                <textarea value={dedForm.notes} onChange={setD("notes")} rows={2} placeholder="Optional remarks..." className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
              </div>

              {/* Live net preview */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 p-3 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gross</p>
                  <p className="text-base font-bold text-white font-mono">{fmt(liveGross)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deductions</p>
                  <p className="text-base font-bold text-red-400 font-mono">-{fmt(liveDed)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Net Pay</p>
                  <p className="text-base font-bold text-emerald-400 font-mono">{fmt(liveNet)}</p>
                </div>
              </div>
            </div>
          )}

          {formErr && <p className="text-sm text-red-400">{formErr}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button onClick={handleEditSave} disabled={isPending} className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Payroll Record</DialogTitle>
            <DialogDescription className="text-slate-400">
              Remove payroll record for <span className="font-semibold text-white">{deleteTarget?.employeeName}</span> ({monthLabel(month)})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
