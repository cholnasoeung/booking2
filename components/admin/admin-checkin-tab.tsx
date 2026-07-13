"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BusFront, Calendar, CheckCheck, CheckCircle2, ChevronDown,
  Clock, LogIn, Mail, MapPin, Phone, RefreshCw, Search, Ticket,
  UserCheck, UserX, Users, XCircle,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
type CheckInStatus = "pending" | "checked-in" | "boarded" | "no-show";

interface Departure {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  busType: string;
  totalSeats: number;
  bookedCount: number;
  checkedIn: number;
  boarded: number;
  noShow: number;
  departureStatus: string;
}

interface PassengerDetail {
  name: string;
  age?: number;
  gender?: string;
  contactNumber?: string;
  email?: string;
}

interface Passenger {
  id: string;
  name: string;
  phone: string;
  email: string;
  seats: string[];
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  boardingStop: string | null;
  droppingStop?: string | null;
  bookingSource: string;
  createdAt: string;
  totalPrice?: number;
  passengerDetails?: PassengerDetail[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<CheckInStatus, { label: string; color: string; bg: string }> = {
  "pending":    { label: "Not Arrived",  color: "text-slate-500",   bg: "bg-slate-100" },
  "checked-in": { label: "Arrived",      color: "text-blue-700",    bg: "bg-blue-100" },
  "boarded":    { label: "Boarded",      color: "text-emerald-700", bg: "bg-emerald-100" },
  "no-show":    { label: "No-Show",      color: "text-red-700",     bg: "bg-red-100" },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function formatTime(t: string) { return t?.slice(0, 5) ?? "—"; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── boarding progress bar ────────────────────────────────────────────────────
function BoardingBar({ dep }: { dep: Departure }) {
  const arrived = dep.checkedIn + dep.boarded;
  const total = dep.bookedCount || 1;
  const pct = Math.round((arrived / total) * 100);
  const boardedPct = Math.round((dep.boarded / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{arrived}/{dep.bookedCount} arrived</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
        <div className="absolute left-0 h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${boardedPct}%` }} />
        <div className="absolute left-0 h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%`, opacity: 0.5 }} />
      </div>
      <div className="flex gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Arrived {dep.checkedIn}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Boarded {dep.boarded}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />No-show {dep.noShow}</span>
      </div>
    </div>
  );
}

// ─── small info tile ─────────────────────────────────────────────────────────
function DTile({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
        <span>{value || <span className="text-slate-300">—</span>}</span>
      </div>
    </div>
  );
}

// ─── passenger row ────────────────────────────────────────────────────────────
function PassengerRow({
  p, dep, onUpdate, updating,
}: {
  p: Passenger;
  dep: Departure;
  onUpdate: (id: string, status: CheckInStatus) => void;
  updating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[p.checkInStatus] ?? STATUS_CONFIG["pending"];

  const avatarBg =
    p.checkInStatus === "boarded"    ? "bg-emerald-600 text-white"
    : p.checkInStatus === "checked-in" ? "bg-blue-600 text-white"
    : p.checkInStatus === "no-show"    ? "bg-red-400 text-white"
    : "bg-slate-200 text-slate-600";

  const rowBg =
    p.checkInStatus === "boarded"    ? "border-emerald-200 bg-emerald-50/40"
    : p.checkInStatus === "checked-in" ? "border-blue-200 bg-blue-50/30"
    : p.checkInStatus === "no-show"    ? "border-red-200 bg-red-50/20"
    : "border-slate-200 bg-white hover:bg-slate-50";

  return (
    <div className={`rounded-xl border transition-colors ${rowBg}`}>
      {/* ── Clickable main row ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${avatarBg}`}>
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              {p.bookingSource === "counter" && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Counter</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-semibold">
                {p.seats.join(", ")}
              </span>
              {p.phone && <span>{p.phone}</span>}
              {p.checkedInAt && (
                <span className="text-blue-500">✓ {timeAgo(p.checkedInAt)}{p.checkedInBy ? ` · ${p.checkedInBy}` : ""}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons — stop propagation so clicks don't toggle expand */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {p.checkInStatus === "pending" && (
            <button disabled={updating} onClick={() => onUpdate(p.id, "checked-in")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <UserCheck className="w-3.5 h-3.5" /> Arrived
            </button>
          )}
          {p.checkInStatus === "checked-in" && (
            <button disabled={updating} onClick={() => onUpdate(p.id, "boarded")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Boarded
            </button>
          )}
          {(p.checkInStatus === "checked-in" || p.checkInStatus === "boarded") && (
            <button disabled={updating} onClick={() => onUpdate(p.id, "pending")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50">
              Undo
            </button>
          )}
          {p.checkInStatus === "pending" && (
            <button disabled={updating} onClick={() => onUpdate(p.id, "no-show")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
              <UserX className="w-3.5 h-3.5" /> No-Show
            </button>
          )}
          {p.checkInStatus === "no-show" && (
            <button disabled={updating} onClick={() => onUpdate(p.id, "pending")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50">
              Restore
            </button>
          )}
          {/* Expand chevron */}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ml-1 ${expanded ? "rotate-180" : ""}`} onClick={() => setExpanded(e => !e)} />
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

          {/* Booking & Trip */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Booking & Trip Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <DTile label="Booking ID"   value={<span className="font-mono text-xs">{p.id.slice(-10)}</span>} icon={Ticket} />
              <DTile label="Route"        value={`${dep.from} → ${dep.to}`} icon={MapPin} />
              <DTile label="Departure"    value={`${formatTime(dep.departureTime)} → ${formatTime(dep.arrivalTime)}`} icon={Clock} />
              <DTile label="Bus Type"     value={dep.busType} icon={BusFront} />
              <DTile label="Booked On"    value={fmtDate(p.createdAt)} icon={Calendar} />
              <DTile label="Source"       value={p.bookingSource === "counter" ? "Counter" : "Online"} />
              {p.totalPrice !== undefined && (
                <DTile label="Total Fare" value={`$${p.totalPrice.toFixed(2)}`} />
              )}
            </div>
          </div>

          {/* Seat & Stops */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Seat & Stop Info</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <DTile label="Seat(s)" value={
                <div className="flex flex-wrap gap-1">
                  {p.seats.map(s => (
                    <span key={s} className="rounded-md bg-slate-800 text-white px-2 py-0.5 text-xs font-bold">{s}</span>
                  ))}
                </div>
              } />
              <DTile label="Boarding Stop" value={p.boardingStop ?? dep.from} icon={MapPin} />
              <DTile label="Drop-off Stop" value={p.droppingStop ?? dep.to} icon={MapPin} />
              {p.checkInStatus !== "pending" && p.checkedInAt && (
                <DTile label="Check-in Time" value={fmtDateTime(p.checkedInAt)} icon={Clock} />
              )}
              {p.checkedInBy && (
                <DTile label="Checked In By" value={p.checkedInBy} />
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Contact Information</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <DTile label="Name"  value={p.name} icon={Users} />
              <DTile label="Phone" value={p.phone || "—"} icon={Phone} />
              <DTile label="Email" value={p.email || "—"} icon={Mail} />
            </div>
          </div>

          {/* Per-passenger details (if available) */}
          {p.passengerDetails && p.passengerDetails.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
                Passenger List ({p.passengerDetails.length})
              </p>
              <div className="space-y-2">
                {p.passengerDetails.map((pd, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{pd.name}</p>
                      <p className="text-xs text-slate-400">
                        {[pd.gender, pd.age ? `Age ${pd.age}` : null, pd.contactNumber, pd.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-200 rounded-md px-2 py-0.5">
                      {p.seats[i] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminCheckinTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);

  const [selectedDep, setSelectedDep] = useState<Departure | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loadingPass, setLoadingPass] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CheckInStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDepartures = useCallback(async () => {
    setLoadingDeps(true);
    try {
      const res = await fetch(`/api/admin/checkin?date=${date}`);
      const data = await res.json();
      setDepartures(data.departures ?? []);
    } finally {
      setLoadingDeps(false);
    }
  }, [date]);

  useEffect(() => { loadDepartures(); }, [loadDepartures]);

  const loadPassengers = useCallback(async (busId: string) => {
    setLoadingPass(true);
    try {
      const res = await fetch(`/api/admin/checkin?busId=${busId}`);
      const data = await res.json();
      setPassengers(data.passengers ?? []);
    } finally {
      setLoadingPass(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDep) return;
    loadPassengers(selectedDep.id);
    intervalRef.current = setInterval(() => loadPassengers(selectedDep.id), 20_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedDep, loadPassengers]);

  async function handleUpdate(bookingId: string, status: CheckInStatus) {
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setPassengers(prev => prev.map(p =>
        p.id === bookingId
          ? { ...p, checkInStatus: updated.checkInStatus, checkedInAt: updated.checkedInAt, checkedInBy: updated.checkedInBy }
          : p
      ));
      if (selectedDep) {
        const delta = (key: CheckInStatus, dir: 1 | -1) => (old: Departure) =>
          old.id !== selectedDep.id ? old : {
            ...old,
            checkedIn: old.checkedIn + (key === "checked-in" ? dir : 0),
            boarded:   old.boarded   + (key === "boarded"    ? dir : 0),
            noShow:    old.noShow    + (key === "no-show"     ? dir : 0),
          };
        const oldStatus = passengers.find(p => p.id === bookingId)?.checkInStatus ?? "pending";
        setDepartures(prev => prev.map(d => delta(oldStatus, -1)(delta(status, 1)(d))));
        setSelectedDep(prev => prev ? delta(oldStatus, -1)(delta(status, 1)(prev)) : prev);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredPassengers = passengers.filter(p => {
    if (statusFilter !== "all" && p.checkInStatus !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.seats.some(s => s.toLowerCase().includes(q)) || p.id.slice(-6).toLowerCase().includes(q);
  });

  const counts = {
    pending:      passengers.filter(p => p.checkInStatus === "pending").length,
    "checked-in": passengers.filter(p => p.checkInStatus === "checked-in").length,
    boarded:      passengers.filter(p => p.checkInStatus === "boarded").length,
    "no-show":    passengers.filter(p => p.checkInStatus === "no-show").length,
  };

  // ── Departure list ─────────────────────────────────────────────────────────
  if (!selectedDep) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Passenger Check-in Board</h2>
            <p className="text-sm text-slate-500">Select a departure to manage boarding</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            <button onClick={loadDepartures} disabled={loadingDeps}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loadingDeps ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {loadingDeps ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <BusFront className="w-10 h-10 mb-2 opacity-30" />
            <p>No departures on {date}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {departures.map(dep => {
              const arrived = dep.checkedIn + dep.boarded;
              const missing = dep.bookedCount - arrived - dep.noShow;
              return (
                <button key={dep.id} onClick={() => setSelectedDep(dep)}
                  className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-400 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{dep.from} → {dep.to}</p>
                      <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {formatTime(dep.departureTime)} · {dep.busType}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase ${
                      dep.departureStatus === "departed" ? "bg-emerald-100 text-emerald-700"
                      : dep.departureStatus === "delayed" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{dep.departureStatus}</span>
                  </div>
                  <BoardingBar dep={dep} />
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    {[
                      { label: "Booked",  value: dep.bookedCount,                 color: "text-slate-700" },
                      { label: "Arrived", value: arrived,                          color: "text-blue-600" },
                      { label: "Missing", value: missing, color: missing > 0 ? "text-amber-600" : "text-slate-400" },
                      { label: "No-show", value: dep.noShow, color: dep.noShow > 0 ? "text-red-600" : "text-slate-400" },
                    ].map(stat => (
                      <div key={stat.label} className="bg-slate-50 rounded-lg py-2">
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 group-hover:text-slate-700 mt-3 font-medium">Manage boarding →</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Passenger board ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => { setSelectedDep(null); setPassengers([]); setSearch(""); setStatusFilter("all"); }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2">
            <ArrowLeft className="w-4 h-4" /> All Departures
          </button>
          <h2 className="text-xl font-bold text-slate-900">{selectedDep.from} → {selectedDep.to}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{selectedDep.departureTime} · {date} · {selectedDep.busType}</p>
        </div>
        <button onClick={() => loadPassengers(selectedDep.id)} disabled={loadingPass}
          className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingPass ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <BoardingBar dep={selectedDep} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Not Arrived", value: counts.pending,        icon: Users,        color: "text-slate-600",   bg: "bg-slate-50"    },
            { label: "Arrived",     value: counts["checked-in"],  icon: LogIn,        color: "text-blue-600",    bg: "bg-blue-50"     },
            { label: "Boarded",     value: counts.boarded,        icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50"  },
            { label: "No-Show",     value: counts["no-show"],     icon: XCircle,      color: "text-red-600",     bg: "bg-red-50"      },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-3 flex items-center gap-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, seat, phone…"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "checked-in", "boarded", "no-show"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {s === "all" ? `All (${passengers.length})` : s === "pending" ? "Pending" : s === "checked-in" ? "Checked In" : s === "boarded" ? "Boarded" : "No Show"}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 flex items-center gap-1">
        <ChevronDown className="w-3 h-3" /> Click a passenger row to view full booking and seat details
      </p>

      {/* Passenger list */}
      <div className="space-y-2">
        {loadingPass && passengers.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading passengers…
          </div>
        )}
        {!loadingPass && filteredPassengers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">
              {search || statusFilter !== "all" ? "No passengers match this filter" : "No bookings for this departure"}
            </p>
          </div>
        )}
        {filteredPassengers.map(p => (
          <PassengerRow
            key={p.id}
            p={p}
            dep={selectedDep}
            onUpdate={handleUpdate}
            updating={updatingId === p.id}
          />
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">Auto-refreshes every 20 seconds</p>
    </div>
  );
}
