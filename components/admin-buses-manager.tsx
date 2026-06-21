"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BusFront, Navigation, PencilLine, Plus, Search, Trash2, UserCheck, MoreVertical,
  CheckSquare2, Square, X, AlertTriangle,
} from "lucide-react";

import AdminBusDialog from "@/components/admin-bus-dialog";
import { AvailabilityBadge, EmptyState, PAGE_SIZE, Paginator, SummaryTile } from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          ) : (
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

                          {/* Actions — compact dropdown */}
                          <TableCell className="py-3 pr-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg opacity-60 transition-opacity hover:bg-orange-100 hover:opacity-100 group-hover:opacity-100 focus:outline-none">
                                <MoreVertical className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => {
                                    setSelectedBus(bus);
                                    setBusDialogOpen(true);
                                  }}
                                >
                                  <PencilLine className="size-4 text-orange-500" />
                                  Edit departure
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => {
                                    setDriverBus(bus);
                                    setSelectedDriverId((bus as any).driverId ?? "");
                                  }}
                                >
                                  <UserCheck className="size-4 text-indigo-500" />
                                  Assign driver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => {
                                    setStatusBus(bus);
                                    setNewStatus((bus as any).departureStatus ?? "scheduled");
                                    setNewDelayMinutes((bus as any).delayMinutes ?? 0);
                                    setNewStatusNote((bus as any).statusNote ?? "");
                                  }}
                                >
                                  <Navigation className="size-4 text-blue-500" />
                                  Update status
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => setBusToDelete(bus)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
