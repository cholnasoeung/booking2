"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete } from "@/lib/swal";
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
  Fuel, Plus, MoreVertical, Pencil, Trash2, DollarSign, Droplets,
  ListFilter, RefreshCw, ChevronLeft, ChevronRight, Gauge, MapPin,
} from "lucide-react";

/* ─── types ─────────────────────────────────────────────────── */
type FuelLog = {
  id: string;
  busDetailId: string; busName: string; busReg: string;
  driverId: string; driverName: string;
  date: string;
  liters: number; pricePerLiter: number; totalCost: number;
  odometer: number | null; station: string | null; notes: string | null;
  createdAt: string;
};
type BusOption    = { id: string; name: string; reg: string };
type DriverOption = { id: string; name: string };
type Summary      = { thisMonthCost: number; thisMonthLiters: number; thisMonthCount: number };
type ChartEntry   = { label: string; totalCost: number; totalLiters: number; count: number };

type ApiData = {
  logs: FuelLog[]; total: number; page: number; totalPages: number;
  summary: Summary; monthly: ChartEntry[];
  buses: BusOption[]; drivers: DriverOption[];
};

/* ─── default form ───────────────────────────────────────────── */
const emptyForm = () => ({
  busDetailId: "", driverId: "",
  date: new Date().toISOString().slice(0, 10),
  liters: "", pricePerLiter: "", odometer: "", station: "", notes: "",
});

/* ─── stat card ─────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, color,
}: {
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

/* ─── form fields shared by Add / Edit ─────────────────────── */
function FuelFormFields({
  form, onChange, buses, drivers,
}: {
  form: ReturnType<typeof emptyForm>;
  onChange: (key: string, val: string) => void;
  buses: BusOption[];
  drivers: DriverOption[];
}) {
  const totalCost =
    form.liters && form.pricePerLiter
      ? (parseFloat(form.liters) * parseFloat(form.pricePerLiter)).toFixed(2)
      : "";

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Vehicle */}
      <div className="col-span-2 sm:col-span-1 space-y-1.5">
        <Label>Vehicle *</Label>
        <Select value={form.busDetailId} onValueChange={(v) => onChange("busDetailId", v ?? "")}>
          <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
          <SelectContent>
            {buses.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} {b.reg ? `(${b.reg})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver */}
      <div className="col-span-2 sm:col-span-1 space-y-1.5">
        <Label>Driver *</Label>
        <Select value={form.driverId} onValueChange={(v) => onChange("driverId", v ?? "")}>
          <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
          <SelectContent>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="col-span-2 sm:col-span-1 space-y-1.5">
        <Label>Date *</Label>
        <Input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} />
      </div>

      {/* Station */}
      <div className="col-span-2 sm:col-span-1 space-y-1.5">
        <Label>Station</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            className="pl-9" placeholder="e.g. Total Energies"
            value={form.station} onChange={(e) => onChange("station", e.target.value)}
          />
        </div>
      </div>

      {/* Liters */}
      <div className="space-y-1.5">
        <Label>Liters *</Label>
        <div className="relative">
          <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="number" min="0.1" step="0.1" className="pl-9" placeholder="0.0"
            value={form.liters} onChange={(e) => onChange("liters", e.target.value)}
          />
        </div>
      </div>

      {/* Price per liter */}
      <div className="space-y-1.5">
        <Label>Price / Liter *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="number" min="0" step="0.01" className="pl-9" placeholder="0.00"
            value={form.pricePerLiter} onChange={(e) => onChange("pricePerLiter", e.target.value)}
          />
        </div>
      </div>

      {/* Total cost — auto-calculated */}
      <div className="space-y-1.5">
        <Label>Total Cost</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
          <Input
            readOnly className="pl-9 bg-emerald-50 text-emerald-700 font-semibold cursor-default"
            value={totalCost ? `$${totalCost}` : ""}
            placeholder="Auto-calculated"
          />
        </div>
      </div>

      {/* Odometer */}
      <div className="space-y-1.5">
        <Label>Odometer (km)</Label>
        <div className="relative">
          <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="number" min="0" className="pl-9" placeholder="Optional"
            value={form.odometer} onChange={(e) => onChange("odometer", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="col-span-2 space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          rows={2} placeholder="Any additional notes..."
          value={form.notes} onChange={(e) => onChange("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminFuelLogsTab() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterBus, setFilterBus]       = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterMonth, setFilterMonth]   = useState("");

  // modals
  const [showAdd, setShowAdd]     = useState(false);
  const [showEdit, setShowEdit]   = useState<FuelLog | null>(null);
  const [showDelete, setShowDelete] = useState<FuelLog | null>(null);

  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showFeedback = (kind: "success" | "error", msg: string) => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ kind, msg });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async (pg = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (filterBus)    params.set("busId",    filterBus);
    if (filterDriver) params.set("driverId", filterDriver);
    if (filterMonth)  params.set("month",    filterMonth);
    try {
      const res = await fetch(`/api/admin/fuel-logs?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, filterBus, filterDriver, filterMonth]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const setField = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFormError("");
  };

  const buildBody = () => ({
    busDetailId:   form.busDetailId,
    driverId:      form.driverId,
    date:          form.date,
    liters:        parseFloat(form.liters),
    pricePerLiter: parseFloat(form.pricePerLiter),
    odometer:      form.odometer ? parseFloat(form.odometer) : undefined,
    station:       form.station || undefined,
    notes:         form.notes   || undefined,
  });

  const handleAdd = () => {
    if (!form.busDetailId || !form.driverId || !form.date || !form.liters || !form.pricePerLiter) {
      setFormError("Vehicle, driver, date, liters and price are required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/fuel-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setForm(emptyForm());
        fetchData(1);
        setPage(1);
        showFeedback("success", "Fuel log added.");
      } else {
        setFormError(json.message ?? "Failed to add.");
      }
    });
  };

  const handleEdit = () => {
    if (!showEdit) return;
    if (!form.busDetailId || !form.driverId || !form.date || !form.liters || !form.pricePerLiter) {
      setFormError("Vehicle, driver, date, liters and price are required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/fuel-logs/${showEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) {
        setShowEdit(null);
        fetchData(page);
        showFeedback("success", "Fuel log updated.");
      } else {
        setFormError(json.message ?? "Failed to update.");
      }
    });
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    if (!(await confirmDelete("this fuel log"))) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/fuel-logs/${showDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDelete(null);
        fetchData(page);
        showFeedback("success", "Fuel log deleted.");
      } else {
        showFeedback("error", "Failed to delete.");
        setShowDelete(null);
      }
    });
  };

  const openEdit = (log: FuelLog) => {
    setForm({
      busDetailId:   log.busDetailId,
      driverId:      log.driverId,
      date:          log.date.slice(0, 10),
      liters:        String(log.liters),
      pricePerLiter: String(log.pricePerLiter),
      odometer:      log.odometer ? String(log.odometer) : "",
      station:       log.station ?? "",
      notes:         log.notes   ?? "",
    });
    setFormError("");
    setShowEdit(log);
  };

  const openAdd = () => {
    setForm(emptyForm());
    setFormError("");
    setShowAdd(true);
  };

  const buses   = data?.buses   ?? [];
  const drivers = data?.drivers ?? [];
  const logs    = data?.logs    ?? [];
  const summary = data?.summary ?? { thisMonthCost: 0, thisMonthLiters: 0, thisMonthCount: 0 };
  const monthly = data?.monthly ?? [];

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-medium",
          feedback.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <Fuel className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Fuel Logs</h2>
            <p className="text-xs text-slate-500">Track driver fuel fill-ups and costs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={openAdd}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
            <Plus className="size-4 mr-1" /> Add Fuel Log
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign} label="This Month's Cost"
          value={`$${summary.thisMonthCost.toFixed(2)}`}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Droplets} label="This Month's Liters"
          value={`${summary.thisMonthLiters.toFixed(1)} L`}
          color="bg-gradient-to-br from-cyan-500 to-blue-600"
        />
        <StatCard
          icon={Fuel} label="Fill-ups This Month"
          value={String(summary.thisMonthCount)}
          sub="total entries"
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      {/* Monthly cost chart */}
      {monthly.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Fuel Cost</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Cost"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="totalCost" fill="url(#fuelGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ListFilter className="size-4 text-slate-400 shrink-0" />

        <Select value={filterBus} onValueChange={(v) => { setFilterBus(v == null || v === "_all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue placeholder="All vehicles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All vehicles</SelectItem>
            {buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterDriver} onValueChange={(v) => { setFilterDriver(v == null || v === "_all" ? "" : v); setPage(1); }}>
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
          onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
        />

        {(filterBus || filterDriver || filterMonth) && (
          <Button variant="ghost" size="sm" className="h-9 text-slate-500"
            onClick={() => { setFilterBus(""); setFilterDriver(""); setFilterMonth(""); setPage(1); }}>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Liters</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">$/L</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Station</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Odo (km)</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Fuel className="size-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No fuel logs found</p>
                    <p className="text-slate-300 text-xs mt-1">Add the first fill-up record to get started.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 truncate max-w-[140px]">{log.busName}</p>
                        {log.busReg && <p className="text-[11px] text-slate-400">{log.busReg}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.driverName}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {log.liters.toFixed(1)} L
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 text-xs">
                      ${log.pricePerLiter.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-700">${log.totalCost.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">
                      {log.station ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">
                      {log.odometer != null ? log.odometer.toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none">
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(log)} className="gap-2">
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setShowDelete(log)}
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

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {data.page} of {data.totalPages} · {data.total} entries
            </p>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="size-5 text-amber-500" /> Add Fuel Log
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <FuelFormFields form={form} onChange={setField} buses={buses} drivers={drivers} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
              {isPending ? "Saving…" : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────── */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!isPending && !o) { setShowEdit(null); setFormError(""); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-indigo-500" /> Edit Fuel Log
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <FuelFormFields form={form} onChange={setField} buses={buses} drivers={drivers} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
              <Trash2 className="size-5" /> Delete Fuel Log
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600">
              Delete the fuel log for{" "}
              <span className="font-semibold text-slate-800">{showDelete?.busName}</span> on{" "}
              <span className="font-semibold text-slate-800">
                {showDelete && new Date(showDelete.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              ? This cannot be undone.
            </p>
          </div>
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
