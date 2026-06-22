"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront, Navigation, PencilLine, Plus, Search, Trash2, UserCheck,
  CheckSquare2, Square, X, AlertTriangle, ChevronDown, ChevronRight,
  LayoutList, Layers, Clock, Bus, User,
} from "lucide-react";

import AdminBusDialog from "@/components/admin-bus-dialog";
import { AvailabilityBadge, EmptyState, PAGE_SIZE, Paginator, SummaryTile } from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { BusSummary, DriverSummary, RouteSummary } from "@/lib/queries";

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type AdminBusesManagerProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  drivers?: DriverSummary[];
  onFeedback: (feedback: FeedbackState) => void;
};

export default function AdminBusesManager({
  routes,
  buses,
  drivers = [],
  onFeedback,
}: AdminBusesManagerProps) {
  const router = useRouter();
  const [busQuery, setBusQuery] = useState("");
  const [busRouteFilter, setBusRouteFilter] = useState("all");
  const [busDateFilter, setBusDateFilter] = useState("");
  const [busDialogOpen, setBusDialogOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusSummary | null>(null);
  const [busToDelete, setBusToDelete] = useState<BusSummary | null>(null);
  const [busDeletePending, setBusDeletePending] = useState(false);
  const [statusBus, setStatusBus] = useState<BusSummary | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [newDelayMinutes, setNewDelayMinutes] = useState(0);
  const [newStatusNote, setNewStatusNote] = useState("");
  const [statusPending, setStatusPending] = useState(false);

  // Driver assignment
  const [driverBus, setDriverBus] = useState<BusSummary | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverPending, setDriverPending] = useState(false);

  const [page, setPage] = useState(1);

  // ── View mode ──
  const [groupedView, setGroupedView] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Bulk select ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  const normalizedQuery = busQuery.trim().toLowerCase();
  const visibleBuses = buses.filter((bus) => {
    if (busRouteFilter !== "all" && bus.routeId !== busRouteFilter) {
      return false;
    }

    if (busDateFilter && bus.travelDate !== busDateFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${bus.from} ${bus.to} ${formatBusType(bus.busType)} ${bus.departureTime} ${bus.arrivalTime}`
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const totalPages = Math.ceil(visibleBuses.length / PAGE_SIZE);
  const pagedBuses = visibleBuses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [busQuery, busRouteFilter, busDateFilter]);

  // Derived selection helpers
  const allPageIds     = pagedBuses.map((b) => b.id);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...allPageIds]));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Build route → time-slot groups from all visible buses
  type TimeSlotGroup = {
    slotKey: string;       // "08:00|||14:00"
    departureTime: string;
    arrivalTime: string;
    buses: BusSummary[];
  };
  type RouteGroup = {
    key: string;
    from: string;
    to: string;
    timeSlots: TimeSlotGroup[];
    seatsLeft: number;
    totalSeats: number;
    totalBuses: number;
    dateMin: string;
    dateMax: string;
  };
  const routeGroups: RouteGroup[] = (() => {
    const routeMap = new Map<string, RouteGroup>();
    for (const bus of visibleBuses) {
      const routeKey = `${bus.from}|||${bus.to}`;
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, {
          key: routeKey, from: bus.from, to: bus.to,
          timeSlots: [], seatsLeft: 0, totalSeats: 0, totalBuses: 0,
          dateMin: bus.travelDate, dateMax: bus.travelDate,
        });
      }
      const rg = routeMap.get(routeKey)!;
      rg.seatsLeft  += bus.seatsLeft;
      rg.totalSeats += bus.totalSeats;
      rg.totalBuses += 1;
      if (bus.travelDate < rg.dateMin) rg.dateMin = bus.travelDate;
      if (bus.travelDate > rg.dateMax) rg.dateMax = bus.travelDate;

      const slotKey = `${bus.departureTime}|||${bus.arrivalTime}`;
      let slot = rg.timeSlots.find((s) => s.slotKey === slotKey);
      if (!slot) {
        slot = { slotKey, departureTime: bus.departureTime, arrivalTime: bus.arrivalTime, buses: [] };
        rg.timeSlots.push(slot);
      }
      slot.buses.push(bus);
    }
    // Sort: route groups by from city; time slots by departure time; buses by date
    const result = [...routeMap.values()].sort((a, b) => a.from.localeCompare(b.from));
    for (const rg of result) {
      rg.timeSlots.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
      for (const slot of rg.timeSlots) {
        slot.buses.sort((a, b) => a.travelDate.localeCompare(b.travelDate));
      }
    }
    return result;
  })();

  async function confirmBulkDelete() {
    setBulkDeletePending(true);
    onFeedback(null);
    try {
      const res = await fetch("/api/admin/buses/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      const payload = await res.json();
      if (!res.ok) {
        onFeedback({ kind: "error", message: payload.message ?? "Bulk delete failed." });
        return;
      }
      onFeedback({ kind: "success", message: payload.message });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    } catch {
      onFeedback({ kind: "error", message: "Request failed. Please try again." });
    } finally {
      setBulkDeletePending(false);
    }
  }

  async function confirmBusDelete() {
    if (!busToDelete) {
      return;
    }

    setBusDeletePending(true);
    onFeedback(null);

    try {
      const response = await fetch(`/api/admin/buses/${busToDelete.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        onFeedback({
          kind: "error",
          message: payload.message || "Unable to delete the departure.",
        });
        return;
      }

      onFeedback({ kind: "success", message: "Departure deleted successfully." });
      setBusToDelete(null);
      router.refresh();
    } catch {
      onFeedback({
        kind: "error",
        message: "Unable to delete the departure right now.",
      });
    } finally {
      setBusDeletePending(false);
    }
  }

  return (
    <>
      <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white to-orange-50/50 shadow-xl backdrop-blur-xl">
        <CardHeader className="border-b-2 border-dashed border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
                  <BusFront className="size-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Bus Departures</CardTitle>
                  <CardDescription className="text-sm">
                    Manage schedules, pricing, seat layouts, and retire departures safely
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setGroupedView(true)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${groupedView ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-orange-50"}`}
                    title="Group by route"
                  >
                    <Layers className="size-3.5" /> Grouped
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupedView(false)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${!groupedView ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-orange-50"}`}
                    title="Flat list"
                  >
                    <LayoutList className="size-3.5" /> List
                  </button>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 shadow-lg transition-all hover:shadow-xl"
                  disabled={routes.length === 0}
                  onClick={() => {
                    setSelectedBus(null);
                    setBusDialogOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add Bus
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_190px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-orange-600/70" />
                <Input
                  value={busQuery}
                  onChange={(event) => setBusQuery(event.target.value)}
                  placeholder="Search by route, type, or time"
                  className="h-11 rounded-xl border-orange-200/70 bg-white/90 pl-9"
                />
              </div>
              <Select
                value={busRouteFilter}
                onValueChange={(value) => {
                  if (value) {
                    setBusRouteFilter(value);
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-orange-200/70 bg-white/90">
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.from} to {route.to}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={busDateFilter}
                onChange={(event) => setBusDateFilter(event.target.value)}
                className="h-11 rounded-xl border-orange-200/70 bg-white/90"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile
              label="Published departures"
              value={String(buses.length)}
              tone="orange"
            />
            <SummaryTile
              label="Seats available"
              value={String(buses.reduce((sum, bus) => sum + bus.seatsLeft, 0))}
              tone="orange"
            />
            <SummaryTile
              label="Seats booked"
              value={String(
                buses.reduce((sum, bus) => sum + (bus.totalSeats - bus.seatsLeft), 0)
              )}
              tone="orange"
            />
          </div>

          {/* ── Bulk action bar ── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                <CheckSquare2 className="size-4 text-orange-600" />
                {selectedIds.size} departure{selectedIds.size !== 1 ? "s" : ""} selected
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="size-3" /> Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
                >
                  <Trash2 className="size-3.5" /> Delete {selectedIds.size} selected
                </button>
              </div>
            </div>
          )}

          {buses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-orange-100/50 px-8 py-12 text-center">
              <BusFront className="mx-auto mb-4 size-12 text-orange-400" />
              <p className="text-sm text-muted-foreground">
                No buses yet. Create your first departure to start selling seats.
              </p>
            </div>
          ) : groupedView ? (
            /* ════════ GROUPED VIEW: Route → Time Slot → Buses ════════ */
            <div className="space-y-3">
              {visibleBuses.length === 0 ? (
                <EmptyState
                  icon={<BusFront className="size-10 text-orange-300" />}
                  title="No departures match these filters"
                  description="Adjust the route, date, or search query to see more results."
                />
              ) : (
                routeGroups.map((group) => {
                  const isOpen   = expandedGroups.has(group.key);
                  const groupIds: string[] = group.timeSlots.flatMap((s: TimeSlotGroup) => s.buses.map((b: BusSummary) => b.id));
                  const allSel   = groupIds.length > 0 && groupIds.every((id: string) => selectedIds.has(id));
                  const someSel  = groupIds.some((id: string) => selectedIds.has(id));
                  const fillPct  = group.totalSeats > 0
                    ? Math.round(((group.totalSeats - group.seatsLeft) / group.totalSeats) * 100)
                    : 0;

                  function toggleGroupSel() {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (allSel) groupIds.forEach((id: string) => next.delete(id));
                      else        groupIds.forEach((id: string) => next.add(id));
                      return next;
                    });
                  }

                  const fmtDate = (d: string) =>
                    new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

                  return (
                    <div
                      key={group.key}
                      className={`rounded-2xl border overflow-hidden transition-shadow ${isOpen ? "border-orange-300 shadow-lg" : "border-orange-200/70 shadow-sm"}`}
                    >
                      {/* ── Route header ── */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors ${isOpen ? "bg-gradient-to-r from-orange-50 to-red-50" : "bg-white hover:bg-orange-50/60"}`}
                        onClick={() => toggleGroup(group.key)}
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleGroupSel(); }}
                          className="shrink-0 text-slate-300 hover:text-orange-500 transition-colors"
                        >
                          {allSel
                            ? <CheckSquare2 className="size-4 text-orange-500" />
                            : someSel
                            ? <CheckSquare2 className="size-4 text-orange-300" />
                            : <Square className="size-4" />}
                        </button>

                        {/* Route label */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {group.from} → {group.to}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {fmtDate(group.dateMin)}{group.dateMin !== group.dateMax ? ` – ${fmtDate(group.dateMax)}` : ""}
                            {" · "}{group.timeSlots.length} time slot{group.timeSlots.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Stat pills */}
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
                            {group.totalBuses} dep{group.totalBuses !== 1 ? "s" : ""}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                            fillPct >= 90 ? "bg-red-50 border-red-200 text-red-700"
                            : fillPct >= 60 ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}>
                            {group.seatsLeft} free
                          </span>
                        </div>

                        {/* Fill bar */}
                        <div className="hidden md:flex flex-col gap-1 w-20 shrink-0">
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${fillPct >= 90 ? "bg-red-500" : fillPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 text-right">{fillPct}% full</span>
                        </div>

                        <div className="shrink-0 text-slate-400">
                          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </div>
                      </div>

                      {/* ── Expanded: time-slot sections ── */}
                      {isOpen && (
                        <div className="border-t border-orange-100 divide-y divide-orange-100/70">
                          {group.timeSlots.map((slot) => {
                            const slotIds = slot.buses.map((b) => b.id);
                            const slotAllSel = slotIds.every((id) => selectedIds.has(id));
                            const slotSomeSel = slotIds.some((id) => selectedIds.has(id));

                            return (
                              <div key={slot.slotKey}>
                                {/* Time slot header */}
                                <div className="flex items-center gap-3 bg-slate-50/80 px-4 py-2 border-b border-orange-100/60">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      if (slotAllSel) slotIds.forEach((id) => next.delete(id));
                                      else slotIds.forEach((id) => next.add(id));
                                      return next;
                                    })}
                                    className="shrink-0 text-slate-300 hover:text-orange-500 transition-colors"
                                  >
                                    {slotAllSel
                                      ? <CheckSquare2 className="size-3.5 text-orange-500" />
                                      : slotSomeSel
                                      ? <CheckSquare2 className="size-3.5 text-orange-300" />
                                      : <Square className="size-3.5" />}
                                  </button>
                                  <Clock className="size-3.5 text-orange-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-700">
                                    {slot.departureTime} – {slot.arrivalTime}
                                  </span>
                                  <span className="ml-1 rounded-full bg-orange-100 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                                    {slot.buses.length} bus{slot.buses.length !== 1 ? "es" : ""}
                                  </span>
                                </div>

                                {/* Buses table inside time slot */}
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-white border-b border-slate-100">
                                      <th className="w-9 pl-10" />
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Bus className="size-3" /> Vehicle</span>
                                      </th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                                        <span className="flex items-center gap-1"><User className="size-3" /> Driver</span>
                                      </th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fare</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seats</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                      <th className="w-9" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {slot.buses.map((bus) => {
                                      const isSel  = selectedIds.has(bus.id);
                                      const booked = bus.totalSeats - bus.seatsLeft;
                                      const pct    = bus.totalSeats > 0 ? Math.round((booked / bus.totalSeats) * 100) : 0;
                                      const vehicleName = (bus as any).busDetail?.name ?? null;
                                      const driverName  = bus.driver?.name ?? null;

                                      return (
                                        <tr
                                          key={bus.id}
                                          className={`transition-colors group/row ${isSel ? "bg-orange-50/70" : "hover:bg-orange-50/30"}`}
                                        >
                                          {/* Checkbox */}
                                          <td className="pl-10 pr-2 py-2.5">
                                            <button type="button" onClick={() => toggleOne(bus.id)}
                                              className="text-slate-200 hover:text-orange-500 transition-colors">
                                              {isSel
                                                ? <CheckSquare2 className="size-3.5 text-orange-500" />
                                                : <Square className="size-3.5" />}
                                            </button>
                                          </td>

                                          {/* Date */}
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            <p className="text-xs font-semibold text-slate-800">
                                              {new Date(bus.travelDate + "T00:00:00Z").toLocaleDateString("en-US", {
                                                weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
                                              })}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                              {new Date(bus.travelDate + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" })}
                                            </p>
                                          </td>

                                          {/* Vehicle */}
                                          <td className="px-3 py-2.5">
                                            {vehicleName ? (
                                              <div className="flex items-center gap-1.5">
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                                                  <Bus className="size-3 text-orange-600" />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{vehicleName}</span>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] text-slate-300 italic">No vehicle</span>
                                            )}
                                          </td>

                                          {/* Driver */}
                                          <td className="px-3 py-2.5 hidden md:table-cell">
                                            {driverName ? (
                                              <div className="flex items-center gap-1.5">
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                                                  <User className="size-3 text-indigo-600" />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">{driverName}</span>
                                              </div>
                                            ) : (
                                              <span className="text-[11px] text-slate-300 italic">No driver</span>
                                            )}
                                          </td>

                                          {/* Bus type */}
                                          <td className="px-3 py-2.5 hidden sm:table-cell">
                                            <Badge className="border-orange-200 bg-orange-100 text-orange-700 text-[10px] py-0 whitespace-nowrap">
                                              {formatBusType(bus.busType)}
                                            </Badge>
                                          </td>

                                          {/* Fare */}
                                          <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                            {formatCurrency(bus.pricePerSeat)}
                                          </td>

                                          {/* Seats */}
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                                                {bus.seatsLeft}/{bus.totalSeats}
                                              </span>
                                              <div className="h-1 w-10 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                                                  style={{ width: `${pct}%` }} />
                                              </div>
                                            </div>
                                          </td>

                                          {/* Status */}
                                          <td className="px-3 py-2.5">
                                            <AvailabilityBadge bus={bus} />
                                          </td>

                                          {/* Actions — inline buttons */}
                                          <td className="pr-3 py-2.5">
                                            <div className="flex items-center gap-1">
                                              <button type="button" title="Edit departure"
                                                onClick={() => { setSelectedBus(bus); setBusDialogOpen(true); }}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500 transition-colors">
                                                <PencilLine className="size-3.5" />
                                              </button>
                                              <button type="button" title="Assign driver"
                                                onClick={() => { setDriverBus(bus); setSelectedDriverId((bus as any).driverId ?? ""); }}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors">
                                                <UserCheck className="size-3.5" />
                                              </button>
                                              <button type="button" title="Update status"
                                                onClick={() => { setStatusBus(bus); setNewStatus((bus as any).departureStatus ?? "scheduled"); setNewDelayMinutes((bus as any).delayMinutes ?? 0); setNewStatusNote((bus as any).statusNote ?? ""); }}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors">
                                                <Navigation className="size-3.5" />
                                              </button>
                                              <button type="button" title="Delete"
                                                onClick={() => setBusToDelete(bus)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                                                <Trash2 className="size-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ════════ FLAT LIST VIEW (existing) ════════ */
            <div className="rounded-2xl border border-orange-200/50 bg-white/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:bg-transparent">
                    {/* Select-all checkbox */}
                    <TableHead className="w-[44px] pl-4">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-orange-400 hover:text-orange-600 transition-colors"
                        title={allPageSelected ? "Deselect all on page" : "Select all on page"}
                      >
                        {allPageSelected
                          ? <CheckSquare2 className="size-4 text-orange-600" />
                          : somePageSelected
                          ? <CheckSquare2 className="size-4 text-orange-400 opacity-60" />
                          : <Square className="size-4" />
                        }
                      </button>
                    </TableHead>
                    <TableHead className="font-bold text-orange-900 w-[220px]">Route</TableHead>
                    <TableHead className="font-bold text-orange-900 w-[90px]">Type</TableHead>
                    <TableHead className="font-bold text-orange-900 w-[130px]">Date & Time</TableHead>
                    <TableHead className="font-bold text-orange-900 w-[70px]">Fare</TableHead>
                    <TableHead className="font-bold text-orange-900 w-[150px]">Seats</TableHead>
                    <TableHead className="font-bold text-orange-900 w-[120px]">Status</TableHead>
                    <TableHead className="w-[44px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10">
                        <EmptyState
                          icon={<BusFront className="size-10 text-orange-300" />}
                          title="No departures match these filters"
                          description="Adjust the route, date, or search query to see more results."
                        />
                      </TableCell>
                    </TableRow>
                  ) : pagedBuses.length === 0 ? (
                    <TableRow><TableCell colSpan={8} /></TableRow>
                  ) : (
                    pagedBuses.map((bus) => {
                      const bookedCount = bus.totalSeats - bus.seatsLeft;
                      const fillPct = bus.totalSeats > 0
                        ? Math.round((bookedCount / bus.totalSeats) * 100)
                        : 0;
                      const isSelected = selectedIds.has(bus.id);
                      return (
                        <TableRow
                          key={bus.id}
                          className={`transition-colors group ${isSelected ? "bg-orange-50/70" : "hover:bg-orange-50/40"}`}
                        >
                          {/* Checkbox */}
                          <TableCell className="py-3 pl-4">
                            <button
                              type="button"
                              onClick={() => toggleOne(bus.id)}
                              className="flex items-center justify-center text-slate-300 hover:text-orange-500 transition-colors"
                            >
                              {isSelected
                                ? <CheckSquare2 className="size-4 text-orange-500" />
                                : <Square className="size-4" />
                              }
                            </button>
                          </TableCell>
                          {/* Route */}
                          <TableCell className="py-3">
                            <p className="font-semibold text-sm text-gray-900 leading-tight">
                              {bus.from} → {bus.to}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {bus.duration} · {bus.distance} km
                            </p>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="py-3">
                            <Badge className="border-orange-200 bg-orange-100 text-orange-700 text-[11px]">
                              {formatBusType(bus.busType)}
                            </Badge>
                          </TableCell>

                          {/* Date & Time (combined) */}
                          <TableCell className="py-3">
                            <p className="text-sm font-medium text-gray-800">
                              {formatTravelDate(bus.travelDate)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {bus.departureTime} – {bus.arrivalTime}
                            </p>
                          </TableCell>

                          {/* Fare */}
                          <TableCell className="py-3 font-semibold text-sm">
                            {formatCurrency(bus.pricePerSeat)}
                          </TableCell>

                          {/* Seats + fill bar */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800">
                                {bus.seatsLeft}/{bus.totalSeats}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({fillPct}% full)
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  fillPct >= 90 ? "bg-red-500"
                                  : fillPct >= 70 ? "bg-amber-500"
                                  : "bg-emerald-500"
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </TableCell>

                          {/* Status + driver */}
                          <TableCell className="py-3">
                            <AvailabilityBadge bus={bus} />
                            {bus.driver && (
                              <p className="text-[11px] text-gray-400 mt-1 truncate max-w-[110px]">
                                {bus.driver.name}
                              </p>
                            )}
                          </TableCell>

                          {/* Actions — inline buttons */}
                          <TableCell className="py-3 pr-3">
                            <div className="flex items-center gap-1">
                              <button type="button" title="Edit departure"
                                onClick={() => { setSelectedBus(bus); setBusDialogOpen(true); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500 transition-colors">
                                <PencilLine className="size-3.5" />
                              </button>
                              <button type="button" title="Assign driver"
                                onClick={() => { setDriverBus(bus); setSelectedDriverId((bus as any).driverId ?? ""); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors">
                                <UserCheck className="size-3.5" />
                              </button>
                              <button type="button" title="Update status"
                                onClick={() => { setStatusBus(bus); setNewStatus((bus as any).departureStatus ?? "scheduled"); setNewDelayMinutes((bus as any).delayMinutes ?? 0); setNewStatusNote((bus as any).statusNote ?? ""); }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors">
                                <Navigation className="size-3.5" />
                              </button>
                              <button type="button" title="Delete"
                                onClick={() => setBusToDelete(bus)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <Paginator
                page={page}
                totalPages={totalPages}
                totalItems={visibleBuses.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(busToDelete)} onOpenChange={(open) => !open && setBusToDelete(null)}>
        <DialogContent className="sm:max-w-md border-2 border-red-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Departure</DialogTitle>
            <DialogDescription>
              {busToDelete
                ? `Delete the ${busToDelete.from} to ${busToDelete.to} departure on ${formatTravelDate(busToDelete.travelDate)} at ${busToDelete.departureTime}?`
                : "Delete this departure?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setBusToDelete(null)}
            >
              Keep Departure
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={busDeletePending}
              onClick={confirmBusDelete}
            >
              {busDeletePending ? "Deleting..." : "Delete Departure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Dialog ── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md border-2 border-red-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl">Delete {selectedIds.size} Departure{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-800">{selectedIds.size} departure{selectedIds.size !== 1 ? "s" : ""}</span>.
              Departures with active bookings will be skipped.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeletePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={bulkDeletePending}
              onClick={confirmBulkDelete}
            >
              {bulkDeletePending
                ? "Deleting…"
                : `Delete ${selectedIds.size} Departure${selectedIds.size !== 1 ? "s" : ""}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status update dialog */}
      <Dialog open={Boolean(statusBus)} onOpenChange={(open) => !open && setStatusBus(null)}>
        <DialogContent className="sm:max-w-sm border-2 border-blue-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Update Departure Status</DialogTitle>
            <DialogDescription>
              {statusBus ? `${statusBus.from} → ${statusBus.to} · ${statusBus.departureTime}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={(v) => { if (v) setNewStatus(v); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["scheduled","on_time","delayed","departed","arrived","cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus === "delayed" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Delay (minutes)</label>
                <Input
                  type="number"
                  min={0}
                  value={newDelayMinutes}
                  onChange={(e) => setNewDelayMinutes(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                value={newStatusNote}
                onChange={(e) => setNewStatusNote(e.target.value)}
                placeholder="e.g. Vehicle breakdown at pickup point"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setStatusBus(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              disabled={statusPending}
              onClick={async () => {
                if (!statusBus) return;
                setStatusPending(true);
                try {
                  const res = await fetch(`/api/admin/buses/${statusBus.id}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus, delayMinutes: newDelayMinutes, statusNote: newStatusNote }),
                  });
                  if (res.ok) {
                    onFeedback({ kind: "success", message: "Status updated successfully." });
                    setStatusBus(null);
                    router.refresh();
                  } else {
                    onFeedback({ kind: "error", message: "Failed to update status." });
                  }
                } finally {
                  setStatusPending(false);
                }
              }}
            >
              {statusPending ? "Saving…" : "Save Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver assignment dialog */}
      <Dialog open={Boolean(driverBus)} onOpenChange={(open) => !open && setDriverBus(null)}>
        <DialogContent className="sm:max-w-sm border-2 border-indigo-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              {driverBus ? `${driverBus.from} → ${driverBus.to} · ${driverBus.departureTime}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {drivers.length === 0 ? (
              <p className="text-sm text-slate-500">No drivers registered. Add drivers first.</p>
            ) : (
              <Select value={selectedDriverId} onValueChange={(v) => { if (v) setSelectedDriverId(v); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No driver —</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} · {d.licenseNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {driverBus?.driver && (
              <p className="text-xs text-slate-500">
                Currently assigned: <span className="font-medium">{driverBus.driver.name}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDriverBus(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={driverPending || drivers.length === 0}
              onClick={async () => {
                if (!driverBus) return;
                setDriverPending(true);
                try {
                  const driverId = selectedDriverId === "none" ? null : selectedDriverId;
                  const res = await fetch(`/api/admin/buses/${driverBus.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ driverId }),
                  });
                  if (res.ok) {
                    onFeedback({ kind: "success", message: driverId ? "Driver assigned." : "Driver removed." });
                    setDriverBus(null);
                    router.refresh();
                  } else {
                    const j = await res.json();
                    onFeedback({ kind: "error", message: j.message ?? "Failed to assign driver." });
                  }
                } finally {
                  setDriverPending(false);
                }
              }}
            >
              {driverPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminBusDialog
        open={busDialogOpen}
        routes={routes}
        bus={selectedBus}
        onOpenChange={(open) => {
          setBusDialogOpen(open);

          if (!open) {
            setSelectedBus(null);
          }
        }}
      />
    </>
  );
}
