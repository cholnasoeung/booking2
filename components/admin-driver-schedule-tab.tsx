"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete } from "@/lib/swal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
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
  CalendarDays, Plus, MoreVertical, Pencil, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Users, Bus, Clock, AlertTriangle,
  CheckCircle2, XCircle, PlayCircle, Calendar, Phone,
} from "lucide-react";

/* ─── constants ─────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  scheduled:  { label: "Scheduled",  color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",    icon: Calendar },
  active:     { label: "Active",     color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", icon: PlayCircle },
  completed:  { label: "Completed",  color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",   icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-600",       dot: "bg-red-400",     icon: XCircle },
  no_show:    { label: "No Show",    color: "bg-orange-100 text-orange-700", dot: "bg-orange-500",  icon: AlertTriangle },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ─── types ─────────────────────────────────────────────────── */
type Schedule = {
  id: string;
  driverId: string; driverName: string; driverPhone: string;
  busDetailId: string; busName: string; busReg: string;
  busId: string | null;
  date: string; shiftStart: string; shiftEnd: string;
  status: string; notes: string | null;
  createdAt: string;
};
type DriverOpt = { id: string; name: string; phone: string };
type BusOpt    = { id: string; name: string; reg: string };
type TripOpt   = { id: string; label: string };
type Summary   = { today: number; thisWeek: number; noShows: number; active: number };
type ApiData   = {
  schedules: Schedule[]; today: Schedule[];
  weekDays: string[]; weekStart: string;
  summary: Summary;
  drivers: DriverOpt[]; buses: BusOpt[]; trips: TripOpt[];
};

const emptyForm = () => ({
  driverId: "", busDetailId: "", busId: "",
  date: new Date().toISOString().slice(0, 10),
  shiftStart: "06:00", shiftEnd: "18:00",
  notes: "",
});

function isoToMonday(d: Date) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isToday(iso: string) {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

/* ─── stat card ─────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-sm">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color)}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

/* ─── schedule card (used in week grid + today panel) ───────── */
function ScheduleCard({
  schedule, onEdit, onDelete, onStatus, compact = false,
}: {
  schedule: Schedule;
  onEdit: (s: Schedule) => void;
  onDelete: (s: Schedule) => void;
  onStatus: (id: string, status: string) => void;
  compact?: boolean;
}) {
  const st = STATUS_MAP[schedule.status] ?? STATUS_MAP.scheduled;
  const Icon = st.icon;

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm transition-all hover:shadow-md",
      compact ? "p-2.5" : "p-3",
      schedule.status === "active"    && "border-emerald-200 bg-emerald-50/40",
      schedule.status === "no_show"   && "border-orange-200 bg-orange-50/30",
      schedule.status === "cancelled" && "border-red-100 opacity-60",
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          {/* Driver */}
          <div className="flex items-center gap-1.5 mb-1">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
              {schedule.driverName.slice(0, 2).toUpperCase()}
            </div>
            <p className={cn("font-semibold text-slate-800 truncate", compact ? "text-xs" : "text-sm")}>
              {schedule.driverName}
            </p>
          </div>
          {/* Bus */}
          <div className="flex items-center gap-1 text-slate-500 mb-1.5">
            <Bus className={cn("shrink-0", compact ? "size-2.5" : "size-3")} />
            <span className={cn("truncate", compact ? "text-[10px]" : "text-xs")}>
              {schedule.busName} {schedule.busReg ? `· ${schedule.busReg}` : ""}
            </span>
          </div>
          {/* Shift time */}
          <div className="flex items-center gap-1">
            <Clock className={cn("shrink-0 text-slate-400", compact ? "size-2.5" : "size-3")} />
            <span className={cn("text-slate-500", compact ? "text-[10px]" : "text-xs")}>
              {schedule.shiftStart} – {schedule.shiftEnd}
            </span>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-6 w-6 shrink-0 -mt-0.5 -mr-0.5 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none">
            <MoreVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onStatus(schedule.id, "active")}
              className="gap-2 text-emerald-700">
              <PlayCircle className="size-3.5" /> Mark Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatus(schedule.id, "completed")}
              className="gap-2 text-slate-600">
              <CheckCircle2 className="size-3.5" /> Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatus(schedule.id, "no_show")}
              className="gap-2 text-orange-600">
              <AlertTriangle className="size-3.5" /> No Show
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatus(schedule.id, "cancelled")}
              className="gap-2 text-red-600">
              <XCircle className="size-3.5" /> Cancel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(schedule)} className="gap-2">
              <Pencil className="size-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(schedule)}
              className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50">
              <Trash2 className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badge */}
      <div className="mt-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", st.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot,
            schedule.status === "active" && "animate-pulse")} />
          {st.label}
        </span>
      </div>
    </div>
  );
}

/* ─── form fields ───────────────────────────────────────────── */
function ScheduleFormFields({ form, onChange, drivers, buses, trips }: {
  form: ReturnType<typeof emptyForm>;
  onChange: (k: string, v: string) => void;
  drivers: DriverOpt[]; buses: BusOpt[]; trips: TripOpt[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Driver *</Label>
          <Select value={form.driverId} onValueChange={(v) => onChange("driverId", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="font-medium">{d.name}</span>
                  {d.phone && <span className="ml-1.5 text-slate-400 text-xs">{d.phone}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Shift Start *</Label>
          <Input type="time" value={form.shiftStart} onChange={(e) => onChange("shiftStart", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Shift End *</Label>
          <Input type="time" value={form.shiftEnd} onChange={(e) => onChange("shiftEnd", e.target.value)} />
        </div>
      </div>

      {trips.length > 0 && (
        <div className="space-y-1.5">
          <Label>Link to Trip <span className="text-slate-400 font-normal">(optional)</span></Label>
          <Select value={form.busId} onValueChange={(v) => onChange("busId", v == null || v === "_none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="No specific trip" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No specific trip</SelectItem>
              {trips.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} placeholder="Any special instructions..."
          value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function AdminDriverScheduleTab() {
  const [data, setData]     = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => isoToMonday(new Date()));
  const [view, setView]     = useState<"week" | "list">("week");

  const [showAdd, setShowAdd]       = useState(false);
  const [showEdit, setShowEdit]     = useState<Schedule | null>(null);
  const [showDelete, setShowDelete] = useState<Schedule | null>(null);

  const [form, setForm]           = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback]   = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const fbTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = (kind: "success" | "error", msg: string) => {
    clearTimeout(fbTimer.current);
    setFeedback({ kind, msg });
    fbTimer.current = setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async (ws = weekStart) => {
    setLoading(true);
    const p = new URLSearchParams({ week: ws.toISOString().slice(0, 10) });
    try {
      const res  = await fetch(`/api/admin/driver-schedules?${p}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { fetchData(weekStart); }, [fetchData, weekStart]);

  const prevWeek = () => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; });
  const goToday  = () => setWeekStart(isoToMonday(new Date()));

  const setField = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setFormError(""); };

  const buildBody = () => ({
    driverId:    form.driverId,
    busDetailId: form.busDetailId,
    busId:       (form.busId && form.busId !== "_none") ? form.busId : undefined,
    date:        form.date,
    shiftStart:  form.shiftStart,
    shiftEnd:    form.shiftEnd,
    notes:       form.notes || undefined,
  });

  const validate = () => {
    if (!form.driverId)    { setFormError("Select a driver.");  return false; }
    if (!form.busDetailId) { setFormError("Select a vehicle."); return false; }
    if (!form.date)        { setFormError("Date is required."); return false; }
    if (!form.shiftStart || !form.shiftEnd) { setFormError("Shift times are required."); return false; }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    startTransition(async () => {
      const res  = await fetch("/api/admin/driver-schedules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) {
        setShowAdd(false); setForm(emptyForm());
        fetchData(weekStart); flash("success", "Schedule added.");
      } else {
        setFormError(json.message ?? "Failed to save.");
      }
    });
  };

  const handleEdit = () => {
    if (!showEdit || !validate()) return;
    startTransition(async () => {
      const res  = await fetch(`/api/admin/driver-schedules/${showEdit.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.ok) { setShowEdit(null); fetchData(weekStart); flash("success", "Schedule updated."); }
      else { setFormError(json.message ?? "Failed to update."); }
    });
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    if (!(await confirmDelete("this schedule"))) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/driver-schedules/${showDelete.id}`, { method: "DELETE" });
      if (res.ok) flash("success", "Schedule deleted.");
      else flash("error", "Failed to delete.");
      setShowDelete(null); fetchData(weekStart);
    });
  };

  const handleStatus = (id: string, status: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/driver-schedules/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { fetchData(weekStart); flash("success", `Marked as ${status.replace("_"," ")}.`); }
    });
  };

  const openEdit = (s: Schedule) => {
    setForm({
      driverId:    s.driverId,
      busDetailId: s.busDetailId,
      busId:       s.busId ?? "",
      date:        s.date.slice(0, 10),
      shiftStart:  s.shiftStart,
      shiftEnd:    s.shiftEnd,
      notes:       s.notes ?? "",
    });
    setFormError("");
    setShowEdit(s);
  };

  const openAdd = () => { setForm(emptyForm()); setFormError(""); setShowAdd(true); };

  const drivers      = data?.drivers      ?? [];
  const buses        = data?.buses        ?? [];
  const trips        = data?.trips        ?? [];
  const schedules    = data?.schedules    ?? [];
  const todayList    = data?.today        ?? [];
  const weekDays     = data?.weekDays     ?? [];
  const summary      = data?.summary      ?? { today: 0, thisWeek: 0, noShows: 0, active: 0 };

  const weekLabel = weekDays.length > 0
    ? `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}`
    : "";

  const getDay = (iso: string) => schedules.filter((s) => s.date.slice(0, 10) === iso);

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <CalendarDays className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Driver Roster</h2>
            <p className="text-xs text-slate-500">Assign drivers to vehicles by shift</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(weekStart)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button variant="ghost" size="sm"
              className={cn("rounded-none h-9 px-3 text-xs font-medium", view === "week" && "bg-slate-100")}
              onClick={() => setView("week")}>
              Week
            </Button>
            <Button variant="ghost" size="sm"
              className={cn("rounded-none h-9 px-3 text-xs font-medium border-l", view === "list" && "bg-slate-100")}
              onClick={() => setView("list")}>
              List
            </Button>
          </div>
          <Button size="sm" onClick={openAdd}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700">
            <Plus className="size-4 mr-1" /> Add Schedule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Drivers Today"     value={summary.today}    color="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard icon={CalendarDays} label="This Week Total"  value={summary.thisWeek} color="bg-gradient-to-br from-sky-500 to-blue-600" />
        <StatCard icon={PlayCircle}  label="Currently Active"  value={summary.active}   color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard icon={AlertTriangle} label="No-Shows (Month)" value={summary.noShows} color="bg-gradient-to-br from-orange-500 to-amber-600" />
      </div>

      {/* Today's Roster panel */}
      {todayList.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Today's Roster — {todayList.length} driver{todayList.length !== 1 ? "s" : ""} scheduled
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {todayList.map((s) => (
              <ScheduleCard key={s.id} schedule={s}
                onEdit={openEdit} onDelete={setShowDelete} onStatus={handleStatus} />
            ))}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ─────────────────────────────────────────── */}
      {view === "week" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Week nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm font-semibold text-slate-700 min-w-[160px] text-center">{weekLabel}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Today
            </Button>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {weekDays.map((day, i) => {
              const daySchedules = getDay(day);
              const today = isToday(day);
              return (
                <div key={day} className={cn(
                  "min-h-[180px] p-2 flex flex-col gap-1.5",
                  today && "bg-indigo-50/50"
                )}>
                  {/* Day header */}
                  <div className={cn(
                    "text-center mb-1 pb-1.5 border-b",
                    today ? "border-indigo-200" : "border-slate-100"
                  )}>
                    <p className={cn("text-[10px] font-semibold uppercase tracking-wider",
                      today ? "text-indigo-600" : "text-slate-400")}>
                      {DAY_NAMES[i]}
                    </p>
                    <p className={cn(
                      "text-base font-bold mt-0.5",
                      today ? "text-indigo-700" : "text-slate-700"
                    )}>
                      {new Date(day + "T00:00:00").getDate()}
                    </p>
                    {daySchedules.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {daySchedules.length} shift{daySchedules.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Schedule cards */}
                  {loading ? (
                    <div className="space-y-1.5">
                      <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                    </div>
                  ) : daySchedules.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[10px] text-slate-300 text-center">No shifts</p>
                    </div>
                  ) : (
                    daySchedules.map((s) => (
                      <ScheduleCard key={s.id} schedule={s} compact
                        onEdit={openEdit} onDelete={setShowDelete} onStatus={handleStatus} />
                    ))
                  )}

                  {/* Quick add for this day */}
                  <button
                    onClick={() => { setForm({ ...emptyForm(), date: day }); setFormError(""); setShowAdd(true); }}
                    className="mt-auto w-full rounded-lg border border-dashed border-slate-200 py-1 text-[10px] text-slate-300 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────── */}
      {view === "list" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {["Driver","Vehicle","Date","Shift","Status","Notes",""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-slate-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <CalendarDays className="size-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No schedules this week</p>
                      <p className="text-slate-300 text-xs mt-1">Use the + Add button to create driver assignments.</p>
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => {
                    const st = STATUS_MAP[s.status] ?? STATUS_MAP.scheduled;
                    return (
                      <tr key={s.id} className={cn(
                        "hover:bg-slate-50/60 transition-colors",
                        s.status === "cancelled" && "opacity-50"
                      )}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{s.driverName}</p>
                            {s.driverPhone && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="size-2.5" />{s.driverPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 font-medium">{s.busName}</p>
                          {s.busReg && <p className="text-[11px] text-slate-400">{s.busReg}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {new Date(s.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs whitespace-nowrap">
                          {s.shiftStart} – {s.shiftEnd}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", st.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", st.dot,
                              s.status === "active" && "animate-pulse")} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">
                          {s.notes ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none">
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleStatus(s.id, "active")} className="gap-2 text-emerald-700">
                                <PlayCircle className="size-3.5" /> Mark Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatus(s.id, "completed")} className="gap-2 text-slate-600">
                                <CheckCircle2 className="size-3.5" /> Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatus(s.id, "no_show")} className="gap-2 text-orange-600">
                                <AlertTriangle className="size-3.5" /> No Show
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatus(s.id, "cancelled")} className="gap-2 text-red-600">
                                <XCircle className="size-3.5" /> Cancel
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(s)} className="gap-2">
                                <Pencil className="size-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowDelete(s)}
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
        </div>
      )}

      {/* ── Add Dialog ─────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!isPending) { setShowAdd(o); if (!o) setFormError(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-indigo-500" /> Add Driver Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ScheduleFormFields form={form} onChange={setField} drivers={drivers} buses={buses} trips={trips} />
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
              {isPending ? "Saving…" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!isPending && !o) { setShowEdit(null); setFormError(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-indigo-500" /> Edit Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ScheduleFormFields form={form} onChange={setField} drivers={drivers} buses={buses} trips={trips} />
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

      {/* ── Delete Confirm ─────────────────────────────────────── */}
      <Dialog open={!!showDelete} onOpenChange={(o) => { if (!isPending && !o) setShowDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" /> Delete Schedule
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-slate-600">
            Remove the schedule for{" "}
            <span className="font-semibold text-slate-800">{showDelete?.driverName}</span> on{" "}
            <span className="font-semibold text-slate-800">
              {showDelete && new Date(showDelete.date).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
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
