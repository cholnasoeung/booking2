"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Wrench, Plus, MoreVertical, Pencil, Trash2, DollarSign,
  RefreshCw, ChevronLeft, ChevronRight, ListFilter, CalendarClock,
  AlertTriangle, CheckCircle2, Clock, Gauge, MapPin, ClipboardList,
} from "lucide-react";

/* ─── constants ─────────────────────────────────────────────── */
const TYPES: Record<string, { label: string; color: string; bar: string }> = {
  oil_change:  { label: "Oil Change",   color: "bg-green-100 text-green-700",   bar: "#22c55e" },
  tire:        { label: "Tire Service", color: "bg-blue-100 text-blue-700",     bar: "#3b82f6" },
  brake:       { label: "Brake",        color: "bg-orange-100 text-orange-700", bar: "#f97316" },
  engine:      { label: "Engine",       color: "bg-red-100 text-red-700",       bar: "#ef4444" },
  inspection:  { label: "Inspection",   color: "bg-purple-100 text-purple-700", bar: "#a855f7" },
  electrical:  { label: "Electrical",   color: "bg-yellow-100 text-yellow-700", bar: "#eab308" },
  bodywork:    { label: "Bodywork",     color: "bg-pink-100 text-pink-700",     bar: "#ec4899" },
  other:       { label: "Other",        color: "bg-slate-100 text-slate-600",   bar: "#94a3b8" },
};

const STATUSES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:   { label: "Completed",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700",       icon: Clock },
  scheduled:   { label: "Scheduled",   color: "bg-amber-100 text-amber-700",     icon: CalendarClock },
};

function daysUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/* ─── types ─────────────────────────────────────────────────── */
type MaintenanceRecord = {
  id: string;
  busDetailId: string; busName: string; busReg: string;
  maintenanceType: string; status: string;
  date: string; cost: number;
  workshop: string | null; odometer: number | null;
  nextServiceDate: string | null; nextServiceOdometer: number | null;
  description: string; notes: string | null;
  createdAt: string;
};
type BusOpt     = { id: string; name: string; reg: string };
type Summary    = { thisMonthCost: number; thisMonthCount: number };
type ChartEntry = { label: string; total: number; [key: string]: number | string };
type Upcoming   = { id: string; busName: string; busReg: string; maintenanceType: string; nextServiceDate: string; nextServiceOdometer: number | null };
type ByType     = { type: string; totalCost: number; count: number };
type ApiData    = { records: MaintenanceRecord[]; total: number; page: number; totalPages: number; summary: Summary; monthly: ChartEntry[]; upcoming: Upcoming[]; byType: ByType[]; buses: BusOpt[] };

const emptyForm = () => ({
  busDetailId: "", maintenanceType: "", status: "completed",
  date: new Date().toISOString().slice(0, 10),
  cost: "", workshop: "", odometer: "",
  nextServiceDate: "", nextServiceOdometer: "",
  description: "", notes: "",
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

/* ─── form fields ───────────────────────────────────────────── */
function MaintenanceFormFields({ form, onChange, buses }: {
  form: ReturnType<typeof emptyForm>;
  onChange: (k: string, v: string) => void;
  buses: BusOpt[];
}) {
  return (
    <div className="space-y-5">
      {/* Row 1: Vehicle + Type + Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Vehicle *</Label>
          <Select value={form.busDetailId} onValueChange={(v) => onChange("busDetailId", v)}>
            <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
            <SelectContent>
              {buses.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} {b.reg ? `(${b.reg})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select value={form.maintenanceType} onValueChange={(v) => onChange("maintenanceType", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Date + Cost + Workshop */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Cost ($) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input type="number" min="0" step="0.01" className="pl-9" placeholder="0.00"
              value={form.cost} onChange={(e) => onChange("cost", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Workshop / Mechanic</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input className="pl-9" placeholder="e.g. City Auto Shop"
              value={form.workshop} onChange={(e) => onChange("workshop", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Row 3: Description */}
      <div className="space-y-1.5">
        <Label>Description *</Label>
        <div className="relative">
          <ClipboardList className="absolute left-3 top-3 size-4 text-slate-400" />
          <Textarea
            className="pl-9 resize-none" rows={2}
            placeholder="e.g. Changed engine oil and oil filter, rotated tires..."
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
        </div>
      </div>

      {/* Row 4: Odometer + Next service reminder */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Odometer at Service (km)</Label>
          <div className="relative">
            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input type="number" min="0" className="pl-9" placeholder="Optional"
              value={form.odometer} onChange={(e) => onChange("odometer", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Next Service Date</Label>
          <div className="relative">
            <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input type="date" className="pl-9" value={form.nextServiceDate}
              onChange={(e) => onChange("nextServiceDate", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Next Service Odometer (km)</Label>
          <Input type="number" min="0" placeholder="e.g. 50000"
            value={form.nextServiceOdometer}
            onChange={(e) => onChange("nextServiceOdometer", e.target.value)} />
        </div>
      </div>

      {/* Row 5: Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} placeholder="Any additional notes..."
          value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminMaintenanceTab() {
  const [data, setData]       = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [filterBus, setFB]    = useState("");
  const [filterType, setFT]   = useState("");
  const [filterMonth, setFM]  = useState("");

  const [showAdd, setShowAdd]       = useState(false);
  const [showEdit, setShowEdit]     = useState<MaintenanceRecord | null>(null);
  const [showDelete, setShowDelete] = useState<MaintenanceRecord | null>(null);

  const [form, setForm]           = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback]   = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const fbTimer = useRef<ReturnType<typeof setTimeout>>();

  const flash = (kind: "success" | "error", msg: string) => {
    clearTimeout(fbTimer.current);
    setFeedback({ kind, msg });
    fbTimer.current = setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async (pg = page) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(pg) });
    if (filterBus)   p.set("busId", filterBus);
    if (filterType)  p.set("type",  filterType);
    if (filterMonth) p.set("month", filterMonth);
    try {
      const res  = await fetch(`/api/admin/maintenance?${p}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, filterBus, filterType, filterMonth]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const setField = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setFormError(""); };

  const buildBody = () => ({
    busDetailId:         form.busDetailId,
    maintenanceType:     form.maintenanceType,
    status:              form.status,
    date:                form.date,
    cost:                parseFloat(form.cost) || 0,
    workshop:            form.workshop || undefined,
    odometer:            form.odometer ? parseFloat(form.odometer) : undefined,
    nextServiceDate:     form.nextServiceDate || undefined,
    nextServiceOdometer: form.nextServiceOdometer ? parseFloat(form.nextServiceOdometer) : undefined,
    description:         form.description,
    notes:               form.notes || undefined,
  });

  const validate = () => {
    if (!form.busDetailId)    { setFormError("Select a vehicle."); return false; }
    if (!form.maintenanceType){ setFormError("Select a maintenance type."); return false; }
    if (!form.date)           { setFormError("Date is required."); return false; }
    if (!form.cost || parseFloat(form.cost) < 0) { setFormError("Cost must be 0 or greater."); return false; }
    if (!form.description.trim()) { setFormError("Description is required."); return false; }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    startTransition(async () => {
      const res  = await fetch("/api/admin/maintenance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) { setShowAdd(false); setForm(emptyForm()); setPage(1); fetchData(1); flash("success", "Maintenance record added."); }
      else { setFormError(json.message ?? "Failed to save."); }
    });
  };

  const handleEdit = () => {
    if (!showEdit || !validate()) return;
    startTransition(async () => {
      const res  = await fetch(`/api/admin/maintenance/${showEdit.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) { setShowEdit(null); fetchData(page); flash("success", "Record updated."); }
      else { setFormError(json.message ?? "Failed to update."); }
    });
  };

  const handleDelete = () => {
    if (!showDelete) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/maintenance/${showDelete.id}`, { method: "DELETE" });
      if (res.ok) flash("success", "Record deleted.");
      else flash("error", "Failed to delete.");
      setShowDelete(null);
      fetchData(page);
    });
  };

  const openEdit = (r: MaintenanceRecord) => {
    setForm({
      busDetailId:         r.busDetailId,
      maintenanceType:     r.maintenanceType,
      status:              r.status,
      date:                r.date.slice(0, 10),
      cost:                String(r.cost),
      workshop:            r.workshop ?? "",
      odometer:            r.odometer != null ? String(r.odometer) : "",
      nextServiceDate:     r.nextServiceDate ? r.nextServiceDate.slice(0, 10) : "",
      nextServiceOdometer: r.nextServiceOdometer != null ? String(r.nextServiceOdometer) : "",
      description:         r.description,
      notes:               r.notes ?? "",
    });
    setFormError("");
    setShowEdit(r);
  };

  const openAdd = () => { setForm(emptyForm()); setFormError(""); setShowAdd(true); };

  const records  = data?.records  ?? [];
  const buses    = data?.buses    ?? [];
  const summary  = data?.summary  ?? { thisMonthCost: 0, thisMonthCount: 0 };
  const monthly  = data?.monthly  ?? [];
  const upcoming = data?.upcoming ?? [];
  const byType   = data?.byType   ?? [];

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div className={cn(
          "rounded-xl border px-4 py-3 text-sm font-medium",
          feedback.kind === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                      : "bg-red-50 border-red-200 text-red-800"
        )}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md">
            <Wrench className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Vehicle Maintenance</h2>
            <p className="text-xs text-slate-500">Track service, repairs & spending per vehicle</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={openAdd}
            className="bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700">
            <Plus className="size-4 mr-1" /> Add Record
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="This Month Spending"
          value={`$${summary.thisMonthCost.toFixed(2)}`}
          color="bg-gradient-to-br from-rose-500 to-red-600" />
        <StatCard icon={Wrench} label="Services This Month"
          value={String(summary.thisMonthCount)} sub="maintenance entries"
          color="bg-gradient-to-br from-slate-500 to-slate-700" />
        <StatCard icon={AlertTriangle} label="Upcoming Services"
          value={String(upcoming.length)} sub="due soon"
          color={upcoming.length > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"} />
      </div>

      {/* Chart + By-type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {monthly.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Maintenance Spending</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Cost"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="total" fill="url(#maintGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost by type */}
        {byType.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Cost by Type</h3>
            <div className="space-y-2.5">
              {byType.map((t) => {
                const info = TYPES[t.type] ?? TYPES.other;
                const max  = byType[0]?.totalCost ?? 1;
                return (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", info.color)}>{info.label}</span>
                      <span className="text-xs font-bold text-slate-700">${t.totalCost.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(t.totalCost / max) * 100}%`, backgroundColor: info.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming service alerts */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4" /> Upcoming Service Reminders
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcoming.map((u) => {
              const days = daysUntil(u.nextServiceDate);
              const urgent = days <= 7;
              return (
                <div key={u.id} className={cn(
                  "rounded-xl border p-3 flex items-center gap-3",
                  urgent ? "border-red-200 bg-red-50" : "border-amber-200 bg-white"
                )}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    urgent ? "bg-red-100" : "bg-amber-100")}>
                    <Wrench className={cn("size-4", urgent ? "text-red-600" : "text-amber-600")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.busName}</p>
                    <p className="text-xs text-slate-500">{TYPES[u.maintenanceType]?.label ?? u.maintenanceType}</p>
                    <p className={cn("text-xs font-bold mt-0.5", urgent ? "text-red-600" : "text-amber-700")}>
                      {days === 0 ? "Due today!" : days < 0 ? `${Math.abs(days)}d overdue` : `In ${days} day${days !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ListFilter className="size-4 text-slate-400 shrink-0" />
        <Select value={filterBus} onValueChange={(v) => { setFB(v === "_all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="All vehicles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All vehicles</SelectItem>
            {buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFT(v === "_all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="month" className="h-9 w-40" value={filterMonth}
          onChange={(e) => { setFM(e.target.value); setPage(1); }} />
        {(filterBus || filterType || filterMonth) && (
          <Button variant="ghost" size="sm" className="h-9 text-slate-500"
            onClick={() => { setFB(""); setFT(""); setFM(""); setPage(1); }}>
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
                {["Vehicle","Type","Status","Date","Cost","Workshop","Odometer","Next Due",""].map((h) => (
                  <th key={h} className={cn(
                    "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide",
                    h === "Cost" || h === "Odometer" ? "text-right" : "text-left"
                  )}>{h}</th>
                ))}
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
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Wrench className="size-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No maintenance records found</p>
                    <p className="text-slate-300 text-xs mt-1">Add the first service record to start tracking.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const typeInfo   = TYPES[r.maintenanceType]   ?? TYPES.other;
                  const statusInfo = STATUSES[r.status] ?? STATUSES.completed;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 truncate max-w-[130px]">{r.busName}</p>
                        {r.busReg && <p className="text-[11px] text-slate-400">{r.busReg}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", statusInfo.color)}>
                          <StatusIcon className="size-3" />{statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">${r.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[110px]">
                        {r.workshop ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">
                        {r.odometer != null ? r.odometer.toLocaleString() : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.nextServiceDate ? (
                          <span className={cn(
                            "font-semibold",
                            daysUntil(r.nextServiceDate) <= 7 ? "text-red-600" : "text-amber-600"
                          )}>
                            {new Date(r.nextServiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => openEdit(r)} className="gap-2">
                              <Pencil className="size-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowDelete(r)}
                              className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="size-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-rose-500" /> Add Maintenance Record
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MaintenanceFormFields form={form} onChange={setField} buses={buses} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending}
              className="bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700">
              {isPending ? "Saving…" : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────── */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!isPending && !o) { setShowEdit(null); setFormError(""); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-indigo-500" /> Edit Maintenance Record
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MaintenanceFormFields form={form} onChange={setField} buses={buses} />
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
              <Trash2 className="size-5" /> Delete Record
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-slate-600">
            Delete the <span className="font-semibold text-slate-800">{showDelete && TYPES[showDelete.maintenanceType]?.label}</span> record
            for <span className="font-semibold text-slate-800">{showDelete?.busName}</span> on{" "}
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
