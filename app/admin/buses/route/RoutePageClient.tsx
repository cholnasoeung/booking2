"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bus, CalendarDays, Armchair, Clock, User,
  PencilLine, UserCheck, Navigation, Users, Megaphone,
  XCircle, Trash2, CheckSquare2, Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AdminBusDialog from "@/components/admin/admin-bus-dialog";
import AdminManifestDialog from "@/components/admin/admin-manifest-dialog";
import AdminTripCancellationDialog from "@/components/admin/admin-trip-cancellation-dialog";
import AdminAnnouncementDialog from "@/components/admin/admin-announcement-dialog";
import { AvailabilityBadge } from "@/components/admin/admin-management-shared";
import { confirmDelete } from "@/lib/utils/swal";
import { formatBusType, formatCurrency } from "@/lib/utils/formatters";
import type { BusSummary, DriverSummary, RouteSummary } from "@/lib/db/queries";

type FeedbackState = { kind: "success" | "error"; message: string } | null;

type Props = {
  from: string;
  to: string;
  buses: BusSummary[];
  routes: RouteSummary[];
  drivers: DriverSummary[];
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RoutePageClient({ from, to, buses, routes, drivers }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // ── Bus edit dialog ──
  const [busDialogOpen, setBusDialogOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusSummary | null>(null);

  // ── Status dialog ──
  const [statusBus, setStatusBus] = useState<BusSummary | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newDelayMinutes, setNewDelayMinutes] = useState(0);
  const [newStatusNote, setNewStatusNote] = useState("");
  const [statusPending, setStatusPending] = useState(false);

  // ── Driver assignment dialog ──
  const [driverBus, setDriverBus] = useState<BusSummary | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverPending, setDriverPending] = useState(false);

  // ── Manifest dialog ──
  const [manifestBusId, setManifestBusId] = useState<string | null>(null);
  const [manifestBusLabel, setManifestBusLabel] = useState("");
  const [manifestOpen, setManifestOpen] = useState(false);

  // ── Cancellation dialog ──
  const [cancelBusId, setCancelBusId] = useState<string | null>(null);
  const [cancelBusLabel, setCancelBusLabel] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  // ── Announcement dialog ──
  const [announceBusId, setAnnounceBusId] = useState<string | null>(null);
  const [announceBusLabel, setAnnounceBusLabel] = useState("");
  const [announceOpen, setAnnounceOpen] = useState(false);

  // ── Bulk select ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Stats ──
  const totalSeats  = buses.reduce((s, b) => s + b.totalSeats, 0);
  const seatsLeft   = buses.reduce((s, b) => s + b.seatsLeft,  0);
  const seatsBooked = totalSeats - seatsLeft;
  const fillPct     = totalSeats > 0 ? Math.round((seatsBooked / totalSeats) * 100) : 0;

  const dates   = [...new Set(buses.map((b) => b.travelDate))].sort();
  const dateMin = dates[0];
  const dateMax = dates[dates.length - 1];
  const fmtDate = (d?: string) =>
    d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    }) : "—";

  // ── Group buses by time slot ──
  type TimeSlot = { departureTime: string; arrivalTime: string; buses: BusSummary[] };
  const slotMap = new Map<string, TimeSlot>();
  for (const bus of buses) {
    const key = `${bus.departureTime}|||${bus.arrivalTime}`;
    if (!slotMap.has(key)) slotMap.set(key, { departureTime: bus.departureTime, arrivalTime: bus.arrivalTime, buses: [] });
    slotMap.get(key)!.buses.push(bus);
  }
  const timeSlots = [...slotMap.values()].sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  // ── Actions ──
  async function handleBusDelete(bus: BusSummary) {
    if (!(await confirmDelete(`${bus.from} → ${bus.to} on ${bus.travelDate} at ${bus.departureTime}`))) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/buses/${bus.id}`, { method: "DELETE" });
      const payload = await res.json() as { message?: string };
      if (!res.ok) { setFeedback({ kind: "error", message: payload.message ?? "Delete failed." }); return; }
      setFeedback({ kind: "success", message: "Departure deleted." });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Request failed." });
    }
  }

  async function handleStatusUpdate() {
    if (!statusBus) return;
    setStatusPending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/buses/${statusBus.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, delayMinutes: newDelayMinutes, statusNote: newStatusNote }),
      });
      const payload = await res.json() as { message?: string };
      if (!res.ok) { setFeedback({ kind: "error", message: payload.message ?? "Update failed." }); return; }
      setFeedback({ kind: "success", message: "Status updated." });
      setStatusBus(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Request failed." });
    } finally {
      setStatusPending(false);
    }
  }

  async function handleDriverAssign() {
    if (!driverBus) return;
    setDriverPending(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/buses/${driverBus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriverId || null }),
      });
      const payload = await res.json() as { message?: string };
      if (!res.ok) { setFeedback({ kind: "error", message: payload.message ?? "Assignment failed." }); return; }
      setFeedback({ kind: "success", message: "Driver assigned." });
      setDriverBus(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Request failed." });
    } finally {
      setDriverPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page header ── */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">

          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/admin?tab=buses" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
              <ArrowLeft className="size-3.5" />
              Back to Buses
            </Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">{from} → {to}</span>
          </div>

          {/* Route title + stats */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
                <Bus className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{from} → {to}</h1>
                {dateMin && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(dateMin)}{dateMin !== dateMax ? ` – ${fmtDate(dateMax)}` : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                <CalendarDays className="size-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-700">{buses.length} departures</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                <Armchair className="size-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-slate-700">{seatsLeft} / {totalSeats} free</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${fillPct >= 90 ? "bg-red-500" : fillPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700">{fillPct}% full</span>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`mt-3 rounded-xl px-4 py-2 text-sm font-medium ${
              feedback.kind === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {feedback.message}
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {buses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <Bus className="mx-auto mb-3 size-10 text-slate-300" />
            <p className="text-sm text-slate-400">No departures found for this route.</p>
          </div>
        ) : (
          timeSlots.map((slot) => {
            // Build date → buses map
            const dateMap = new Map<string, BusSummary[]>();
            for (const bus of slot.buses) {
              if (!dateMap.has(bus.travelDate)) dateMap.set(bus.travelDate, []);
              dateMap.get(bus.travelDate)!.push(bus);
            }

            const sortedDates = [...dateMap.keys()].sort();
            const minD = new Date(sortedDates[0] + "T00:00:00Z");
            const maxD = new Date(sortedDates[sortedDates.length - 1] + "T00:00:00Z");

            // Expand to full Mon–Sun weeks
            const weekStart = new Date(minD);
            const ds = weekStart.getUTCDay();
            weekStart.setUTCDate(weekStart.getUTCDate() - (ds === 0 ? 6 : ds - 1));
            const weekEnd = new Date(maxD);
            const de = weekEnd.getUTCDay();
            weekEnd.setUTCDate(weekEnd.getUTCDate() + (de === 0 ? 0 : 7 - de));

            const weeks: string[][] = [];
            const cur = new Date(weekStart);
            while (cur <= weekEnd) {
              const wk: string[] = [];
              for (let d = 0; d < 7; d++) {
                wk.push(cur.toISOString().slice(0, 10));
                cur.setUTCDate(cur.getUTCDate() + 1);
              }
              weeks.push(wk);
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const slotTotal = slot.buses.reduce((s, b) => s + b.totalSeats, 0);
            const slotLeft  = slot.buses.reduce((s, b) => s + b.seatsLeft,  0);
            const slotPct   = slotTotal > 0 ? Math.round(((slotTotal - slotLeft) / slotTotal) * 100) : 0;

            return (
              <div key={slot.departureTime} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {/* Time slot header */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-indigo-500" />
                    <span className="text-sm font-bold text-slate-800">{slot.departureTime}</span>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-sm font-bold text-slate-800">{slot.arrivalTime}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600">
                      {slot.buses.length} dep{slot.buses.length !== 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      {slotLeft}/{slotTotal} seats free
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${slotPct >= 90 ? "bg-red-500" : slotPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${slotPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{slotPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="p-4 space-y-2">
                  {/* Day-of-week header */}
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {DAY_NAMES.map((d, i) => (
                      <div
                        key={d}
                        className={`text-center text-[9px] font-bold uppercase tracking-widest py-1.5 rounded-lg ${
                          i >= 5 ? "text-rose-400 bg-rose-50" : "text-slate-400 bg-slate-50"
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Week rows */}
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1.5 items-start">
                      {week.map((dateStr, di) => {
                        const dayBuses = dateMap.get(dateStr) ?? [];
                        const date     = new Date(dateStr + "T00:00:00Z");
                        const isToday  = dateStr === todayStr;
                        const hasBus   = dayBuses.length > 0;
                        const isWeekend = di >= 5;

                        return (
                          <div
                            key={dateStr}
                            className={`min-h-[72px] rounded-xl border transition-colors ${
                              hasBus
                                ? "border-indigo-100 bg-white shadow-sm"
                                : isWeekend
                                ? "border-rose-50 bg-rose-50/20"
                                : "border-slate-100 bg-slate-50/40"
                            }`}
                          >
                            {/* Date number */}
                            <div className={`flex flex-col items-center pt-2 pb-1 ${hasBus ? "border-b border-indigo-50" : ""}`}>
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  isToday
                                    ? "bg-indigo-600 text-white"
                                    : hasBus
                                    ? "text-slate-800"
                                    : "text-slate-300"
                                }`}
                              >
                                {date.getUTCDate()}
                              </span>
                              {hasBus && (
                                <span className="text-[9px] font-semibold text-indigo-400 mt-0.5">
                                  {date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                                </span>
                              )}
                            </div>

                            {/* Bus mini-cards */}
                            <div className="p-1 space-y-1">
                              {dayBuses.map((bus) => {
                                const isSel  = selectedIds.has(bus.id);
                                const booked = bus.totalSeats - bus.seatsLeft;
                                const pct    = bus.totalSeats > 0 ? Math.round((booked / bus.totalSeats) * 100) : 0;
                                const vehicleName = (bus as any).busDetail?.name ?? null;
                                const driverName  = bus.driver?.name ?? null;

                                return (
                                  <div
                                    key={bus.id}
                                    className={`rounded-lg border p-1.5 text-[10px] transition-colors ${
                                      isSel
                                        ? "border-indigo-300 bg-indigo-50"
                                        : "border-slate-100 bg-slate-50 hover:border-indigo-200"
                                    }`}
                                  >
                                    {/* Select + vehicle */}
                                    <div className="flex items-center gap-1 mb-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleOne(bus.id)}
                                        className="shrink-0 text-slate-300 hover:text-indigo-500 transition-colors"
                                      >
                                        {isSel
                                          ? <CheckSquare2 className="size-3 text-indigo-500" />
                                          : <Square className="size-3" />}
                                      </button>
                                      <Bus className="size-2.5 text-indigo-400 shrink-0" />
                                      <span className="font-semibold text-slate-700 truncate flex-1 min-w-0">
                                        {vehicleName ?? <span className="italic text-slate-300">—</span>}
                                      </span>
                                    </div>

                                    {/* Driver */}
                                    <div className="flex items-center gap-1 mb-1 pl-4">
                                      <User className="size-2.5 text-slate-300 shrink-0" />
                                      <span className={`truncate ${driverName ? "text-slate-500" : "italic text-slate-300"}`}>
                                        {driverName ?? "No driver"}
                                      </span>
                                    </div>

                                    {/* Type + fare */}
                                    <div className="flex items-center justify-between gap-1 mb-1 pl-4">
                                      <Badge className="border-slate-200 bg-white text-slate-500 text-[9px] py-0 px-1 h-4 font-medium">
                                        {formatBusType(bus.busType)}
                                      </Badge>
                                      <span className="font-bold text-emerald-600 shrink-0">{formatCurrency(bus.pricePerSeat)}</span>
                                    </div>

                                    {/* Seat fill bar */}
                                    <div className="pl-4 mb-1">
                                      <div className="flex items-center gap-1">
                                        <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="text-slate-400 shrink-0 tabular-nums">{bus.seatsLeft}/{bus.totalSeats}</span>
                                      </div>
                                    </div>

                                    {/* Status badge — click to update status */}
                                    <div className="pl-1 mb-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStatusBus(bus);
                                          setNewStatus((bus as any).departureStatus ?? "scheduled");
                                          setNewDelayMinutes((bus as any).delayMinutes ?? 0);
                                          setNewStatusNote((bus as any).statusNote ?? "");
                                        }}
                                        className="text-left w-full hover:opacity-75 transition-opacity"
                                      >
                                        <AvailabilityBadge bus={bus} />
                                      </button>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-px pl-1 pt-1 border-t border-slate-100">
                                      <button type="button" title="Edit"
                                        onClick={() => { setSelectedBus(bus); setBusDialogOpen(true); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-indigo-100 text-indigo-400 transition-colors">
                                        <PencilLine className="size-3" />
                                      </button>
                                      <button type="button" title="Assign driver"
                                        onClick={() => { setDriverBus(bus); setSelectedDriverId((bus as any).driverId ?? ""); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-indigo-100 text-indigo-400 transition-colors">
                                        <UserCheck className="size-3" />
                                      </button>
                                      <button type="button" title="Update status"
                                        onClick={() => { setStatusBus(bus); setNewStatus((bus as any).departureStatus ?? "scheduled"); setNewDelayMinutes((bus as any).delayMinutes ?? 0); setNewStatusNote((bus as any).statusNote ?? ""); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-blue-100 text-blue-400 transition-colors">
                                        <Navigation className="size-3" />
                                      </button>
                                      <button type="button" title="Manifest"
                                        onClick={() => { setManifestBusId(bus.id); setManifestBusLabel(`${bus.from} → ${bus.to}`); setManifestOpen(true); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-teal-100 text-teal-400 transition-colors">
                                        <Users className="size-3" />
                                      </button>
                                      <button type="button" title="Announce"
                                        onClick={() => { setAnnounceBusId(bus.id); setAnnounceBusLabel(`${bus.from} → ${bus.to} · ${bus.travelDate} ${bus.departureTime}`); setAnnounceOpen(true); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-violet-100 text-violet-400 transition-colors">
                                        <Megaphone className="size-3" />
                                      </button>
                                      <button type="button" title="Cancel"
                                        onClick={() => { setCancelBusId(bus.id); setCancelBusLabel(`${bus.from} → ${bus.to} · ${bus.travelDate} ${bus.departureTime}`); setCancelOpen(true); }}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-rose-100 text-rose-400 transition-colors">
                                        <XCircle className="size-3" />
                                      </button>
                                      <button type="button" title="Delete"
                                        onClick={() => handleBusDelete(bus)}
                                        className="flex-1 flex items-center justify-center h-5 rounded hover:bg-red-100 text-red-400 transition-colors">
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════ Dialogs ═══════════ */}

      {/* Edit bus dialog */}
      <AdminBusDialog
        open={busDialogOpen}
        onOpenChange={(open) => { setBusDialogOpen(open); if (!open) setSelectedBus(null); }}
        bus={selectedBus}
        routes={routes}
        onSuccess={() => { setFeedback({ kind: "success", message: "Departure saved." }); setBusDialogOpen(false); router.refresh(); }}
      />

      {/* Manifest dialog */}
      {manifestBusId && (
        <AdminManifestDialog
          open={manifestOpen}
          onClose={() => { setManifestOpen(false); setManifestBusId(null); setManifestBusLabel(""); }}
          busId={manifestBusId}
          busLabel={manifestBusLabel}
        />
      )}

      {/* Trip cancellation dialog */}
      {cancelBusId && (
        <AdminTripCancellationDialog
          open={cancelOpen}
          onOpenChange={(open) => { setCancelOpen(open); if (!open) { setCancelBusId(null); setCancelBusLabel(""); } }}
          busId={cancelBusId}
          busLabel={cancelBusLabel}
          onCancelled={() => { setFeedback({ kind: "success", message: "Trip cancelled." }); setCancelOpen(false); router.refresh(); }}
        />
      )}

      {/* Announcement dialog */}
      {announceBusId && (
        <AdminAnnouncementDialog
          open={announceOpen}
          onOpenChange={(open) => { setAnnounceOpen(open); if (!open) { setAnnounceBusId(null); setAnnounceBusLabel(""); } }}
          busId={announceBusId}
          busLabel={announceBusLabel}
          onSuccess={() => { setFeedback({ kind: "success", message: "Announcement sent." }); setAnnounceOpen(false); }}
        />
      )}

      {/* Status update dialog */}
      <Dialog open={!!statusBus} onOpenChange={(open) => { if (!open) setStatusBus(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Departure Status</DialogTitle>
            <DialogDescription>
              {statusBus ? `${statusBus.from} → ${statusBus.to} · ${statusBus.travelDate} ${statusBus.departureTime}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="on_time">On Time</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="departed">Departed</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === "delayed" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Delay (minutes)</label>
                <Input type="number" min={0} value={newDelayMinutes} onChange={(e) => setNewDelayMinutes(Number(e.target.value))} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Note (optional)</label>
              <Input value={newStatusNote} onChange={(e) => setNewStatusNote(e.target.value)} placeholder="Reason or note…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusBus(null)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={statusPending}>
              {statusPending ? "Saving…" : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver assignment dialog */}
      <Dialog open={!!driverBus} onOpenChange={(open) => { if (!open) setDriverBus(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              {driverBus ? `${driverBus.from} → ${driverBus.to} · ${driverBus.travelDate} ${driverBus.departureTime}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger><SelectValue placeholder="Select a driver…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Unassign —</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriverBus(null)}>Cancel</Button>
            <Button onClick={handleDriverAssign} disabled={driverPending}>
              {driverPending ? "Saving…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
