"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete, toastSuccess, toastError } from "@/lib/swal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Wallet, Plus, MoreVertical, Pencil, Trash2, DollarSign,
  RefreshCw, ChevronLeft, ChevronRight, ListFilter, Trophy,
  Clock, TrendingUp, Bus,
} from "lucide-react";

/* ─── types ─────────────────────────────────────────────────── */
type EarningEntry = {
  id: string;
  driverId: string; driverName: string;
  busDetailId: string | null; busName: string | null; busReg: string | null;
  date: string;
  regularTrips: number; overtimeTrips: number;
  basePay: number; overtimeRate: number;
  regularEarnings: number; overtimeEarnings: number; totalEarnings: number;
  notes: string | null;
  createdAt: string;
};
type DriverOpt = { id: string; name: string };
type BusOpt    = { id: string; name: string; reg: string };
type Summary   = { thisMonthPayroll: number; thisMonthOvertime: number; thisMonthRegular: number; thisMonthCount: number };
type ChartEntry = { label: string; totalPayroll: number; regular: number; overtime: number };
type TopDriver  = { name: string; totalEarnings: number; overtime: number; trips: number };

type ApiData = {
  entries: EarningEntry[]; total: number; page: number; totalPages: number;
  summary: Summary; monthly: ChartEntry[]; topDrivers: TopDriver[];
  drivers: DriverOpt[]; buses: BusOpt[];
};

const emptyForm = () => ({
  driverId: "", busDetailId: "_none",
  date: new Date().toISOString().slice(0, 10),
  regularTrips: "1", overtimeTrips: "0",
  basePay: "", overtimeRate: "1.5",
  notes: "",
});

/* ─── stat card ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-sm">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── earnings preview (auto-calculates) ───────────────────── */
function calcEarnings(form: ReturnType<typeof emptyForm>) {
  const rt  = Math.max(0, parseFloat(form.regularTrips)  || 0);
  const ot  = Math.max(0, parseFloat(form.overtimeTrips) || 0);
  const bp  = parseFloat(form.basePay)    || 0;
  const otr = parseFloat(form.overtimeRate) || 1.5;
  const regular  = rt * bp;
  const overtime = ot * bp * otr;
  return { regular, overtime, total: regular + overtime };
}

/* ─── form fields ───────────────────────────────────────────── */
function EarningFormFields({ form, onChange, drivers, buses }: {
  form: ReturnType<typeof emptyForm>;
  onChange: (k: string, v: string) => void;
  drivers: DriverOpt[]; buses: BusOpt[];
}) {
  const { regular, overtime, total } = calcEarnings(form);

  return (
    <div className="space-y-5">
      {/* Driver + Vehicle */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Driver *</Label>
          <Select
            value={form.driverId}
            onValueChange={(v) => onChange("driverId", v ?? "")}
          >
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vehicle <span className="text-slate-400 font-normal">(optional)</span></Label>
          <Select
            value={form.busDetailId}
            onValueChange={(v) => onChange("busDetailId", v ?? "")}
          >
            <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Not specified</SelectItem>
              {buses.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} {b.reg ? `(${b.reg})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date *</Label>
        <Input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} className="max-w-xs" />
      </div>

      {/* Trips */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Regular Trips</Label>
          <Input
            type="number" min="0" step="1" placeholder="0"
            value={form.regularTrips}
            onChange={(e) => onChange("regularTrips", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Overtime Trips
            <span className="rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5">OT</span>
          </Label>
          <Input
            type="number" min="0" step="1" placeholder="0"
            value={form.overtimeTrips}
            onChange={(e) => onChange("overtimeTrips", e.target.value)}
          />
        </div>
      </div>

      {/* Pay rates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Base Pay / Trip *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="number" min="0" step="0.01" className="pl-9" placeholder="e.g. 15.00"
              value={form.basePay}
              onChange={(e) => onChange("basePay", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Overtime Multiplier</Label>
          <Select value={form.overtimeRate} onValueChange={(v) => onChange("overtimeRate", v ?? "")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1.25">1.25× (25% extra)</SelectItem>
              <SelectItem value="1.5">1.5× (50% extra)</SelectItem>
              <SelectItem value="2">2× (double pay)</SelectItem>
              <SelectItem value="2.5">2.5× (holiday pay)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Auto earnings breakdown */}
      {form.basePay && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Earnings Breakdown</p>
          <div className="flex justify-between">
            <span className="text-slate-600">Regular ({form.regularTrips || 0} × ${form.basePay || 0})</span>
            <span className="font-semibold text-slate-700">${regular.toFixed(2)}</span>
          </div>
          {parseFloat(form.overtimeTrips) > 0 && (
            <div className="flex justify-between">
              <span className="text-orange-600">
                Overtime ({form.overtimeTrips} × ${form.basePay} × {form.overtimeRate}×)
              </span>
              <span className="font-semibold text-orange-600">${overtime.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 flex justify-between">
            <span className="font-bold text-slate-800">Total Earnings</span>
            <span className="font-bold text-emerald-700 text-base">${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          rows={2} placeholder="e.g. Public holiday bonus, night shift..."
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminDriverEarningsTab() {
  const [data, setData]           = useState<ApiData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [filterDriver, setFD]     = useState("");
  const [filterMonth, setFM]      = useState("");

  const [showAdd, setShowAdd]     = useState(false);
  const [showEdit, setShowEdit]   = useState<EarningEntry | null>(null);
  const [showDelete, setShowDelete] = useState<EarningEntry | null>(null);

  const [form, setForm]           = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fetchData = useCallback(async (pg = page) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(pg) });
    if (filterDriver) p.set("driverId", filterDriver);
    if (filterMonth)  p.set("month",    filterMonth);
    try {
      const res  = await fetch(`/api/admin/driver-earnings?${p}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, filterDriver, filterMonth]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const setField = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setFormError(""); };

  const buildBody = () => ({
    driverId:      form.driverId,
    busDetailId:   (form.busDetailId && form.busDetailId !== "_none") ? form.busDetailId : undefined,
    date:          form.date,
    regularTrips:  parseFloat(form.regularTrips)  || 0,
    overtimeTrips: parseFloat(form.overtimeTrips) || 0,
    basePay:       parseFloat(form.basePay),
    overtimeRate:  parseFloat(form.overtimeRate) || 1.5,
    notes:         form.notes || undefined,
  });

  const validate = () => {
    if (!form.driverId) { setFormError("Select a driver."); return false; }
    if (!form.date)     { setFormError("Date is required."); return false; }
    if (!form.basePay || parseFloat(form.basePay) <= 0) { setFormError("Base pay must be greater than 0."); return false; }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    startTransition(async () => {
      const res  = await fetch("/api/admin/driver-earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) {
        setShowAdd(false); setForm(emptyForm());
        setPage(1); fetchData(1);
        toastSuccess("Earning entry added.");
      } else {
        setFormError(json.message ?? "Failed to save.");
      }
    });
  };

  const handleEdit = () => {
    if (!showEdit || !validate()) return;
    startTransition(async () => {
      const res  = await fetch(`/api/admin/driver-earnings/${showEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) {
        setShowEdit(null); fetchData(page);
        toastSuccess("Entry updated.");
      } else {
        setFormError(json.message ?? "Failed to update.");
      }
    });
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    if (!(await confirmDelete("this earnings entry"))) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/driver-earnings/${showDelete.id}`, { method: "DELETE" });
      if (res.ok) { toastSuccess("Entry deleted."); fetchData(page); }
      else        { toastError("Failed to delete."); }
      setShowDelete(null);
    });
  };

  const openEdit = (e: EarningEntry) => {
    setForm({
      driverId:     e.driverId,
      busDetailId:  e.busDetailId ?? "_none",
      date:         e.date.slice(0, 10),
      regularTrips: String(e.regularTrips),
      overtimeTrips: String(e.overtimeTrips),
      basePay:      String(e.basePay),
      overtimeRate: String(e.overtimeRate),
      notes:        e.notes ?? "",
    });
    setFormError("");
    setShowEdit(e);
  };

  const openAdd = () => { setForm(emptyForm()); setFormError(""); setShowAdd(true); };

  const drivers    = data?.drivers    ?? [];
  const buses      = data?.buses      ?? [];
  const entries    = data?.entries    ?? [];
  const summary    = data?.summary    ?? { thisMonthPayroll: 0, thisMonthOvertime: 0, thisMonthRegular: 0, thisMonthCount: 0 };
  const monthly    = data?.monthly    ?? [];
  const topDrivers = data?.topDrivers ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
            <Wallet className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Driver Earnings</h2>
            <p className="text-xs text-slate-500">Track regular & overtime pay per driver</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={openAdd}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2">
            <Plus className="size-4" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign} label="This Month Payroll"
          value={`$${summary.thisMonthPayroll.toFixed(2)}`}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          icon={TrendingUp} label="Regular Pay"
          value={`$${summary.thisMonthRegular.toFixed(2)}`}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Clock} label="Overtime Pay"
          value={`$${summary.thisMonthOvertime.toFixed(2)}`}
          sub={summary.thisMonthPayroll > 0
            ? `${Math.round((summary.thisMonthOvertime / summary.thisMonthPayroll) * 100)}% of payroll`
            : undefined}
          color="bg-gradient-to-br from-orange-500 to-amber-600"
        />
        <StatCard
          icon={Wallet} label="Entries This Month"
          value={String(summary.thisMonthCount)}
          sub="pay records"
          color="bg-gradient-to-br from-sky-500 to-blue-600"
        />
      </div>

      {/* Chart + Top drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly bar chart */}
        {monthly.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Payroll</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v, name) => [`$${Number(v ?? 0).toFixed(2)}`, name === "regular" ? "Regular" : "Overtime"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend formatter={(v) => v === "regular" ? "Regular" : "Overtime"} />
                <Bar dataKey="regular"  stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overtime" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top earners */}
        {topDrivers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" /> Top Earners This Month
            </h3>
            <div className="space-y-3">
              {topDrivers.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : "bg-orange-700/70"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400">{d.trips} trips · ${d.overtime.toFixed(2)} OT</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">${d.totalEarnings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ListFilter className="size-4 text-slate-400 shrink-0" />

        <Select value={filterDriver} onValueChange={(v) => { setFD(v == null || v === "_all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All drivers</SelectItem>
            {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          type="month" className="h-9 w-40"
          value={filterMonth}
          onChange={(e) => { setFM(e.target.value); setPage(1); }}
        />

        {(filterDriver || filterMonth) && (
          <Button variant="ghost" size="sm" className="h-9 text-slate-500"
            onClick={() => { setFD(""); setFM(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Regular</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">OT Trips</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Base/$</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">OT Pay</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-slate-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Wallet className="size-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No earning records yet</p>
                    <p className="text-slate-300 text-xs mt-1">Add the first entry to start tracking driver pay.</p>
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{e.driverName}</td>
                    <td className="px-4 py-3">
                      {e.busName ? (
                        <div className="flex items-center gap-1.5">
                          <Bus className="size-3.5 text-slate-400" />
                          <span className="text-slate-600 text-xs truncate max-w-[100px]">{e.busName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{e.regularTrips}</td>
                    <td className="px-4 py-3 text-right">
                      {e.overtimeTrips > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5">
                          <Clock className="size-3" />{e.overtimeTrips}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">${e.basePay.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600 text-xs">
                      {e.overtimeEarnings > 0 ? `$${e.overtimeEarnings.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-700">${e.totalEarnings.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(e)} className="gap-2">
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setShowDelete(e)}
                            className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="size-3.5" /> Delete
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

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">Page {data.page} of {data.totalPages} · {data.total} records</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8"
                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8"
                disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Dialog ─────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!isPending) { setShowAdd(o); if (!o) setFormError(""); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-violet-500" /> Add Earning Entry
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <EarningFormFields form={form} onChange={setField} drivers={drivers} buses={buses} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              {isPending ? "Saving…" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────── */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!isPending && !o) { setShowEdit(null); setFormError(""); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-indigo-500" /> Edit Earning Entry
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <EarningFormFields form={form} onChange={setField} drivers={drivers} buses={buses} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────── */}
      <Dialog open={!!showDelete} onOpenChange={(o) => { if (!isPending && !o) setShowDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" /> Delete Entry
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-slate-600">
            Delete the earning record for{" "}
            <span className="font-semibold text-slate-800">{showDelete?.driverName}</span> on{" "}
            <span className="font-semibold text-slate-800">
              {showDelete && new Date(showDelete.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
