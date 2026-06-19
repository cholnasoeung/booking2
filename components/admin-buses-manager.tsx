"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, Navigation, PencilLine, Plus, Search, Trash2 } from "lucide-react";

import AdminBusDialog from "@/components/admin-bus-dialog";
import { AvailabilityBadge, EmptyState, PAGE_SIZE, Paginator, SummaryTile } from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { BusSummary, RouteSummary } from "@/lib/queries";

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type AdminBusesManagerProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  onFeedback: (feedback: FeedbackState) => void;
};

export default function AdminBusesManager({
  routes,
  buses,
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

  const [page, setPage] = useState(1);

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

  useEffect(() => { setPage(1); }, [busQuery, busRouteFilter, busDateFilter]);

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

          {buses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-orange-100/50 px-8 py-12 text-center">
              <BusFront className="mx-auto mb-4 size-12 text-orange-400" />
              <p className="text-sm text-muted-foreground">
                No buses yet. Create your first departure to start selling seats.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-orange-200/50 bg-white/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:bg-transparent">
                    <TableHead className="font-bold text-orange-900">Route</TableHead>
                    <TableHead className="font-bold text-orange-900">Type</TableHead>
                    <TableHead className="font-bold text-orange-900">Date</TableHead>
                    <TableHead className="font-bold text-orange-900">Schedule</TableHead>
                    <TableHead className="font-bold text-orange-900">Fare</TableHead>
                    <TableHead className="font-bold text-orange-900">Seats</TableHead>
                    <TableHead className="font-bold text-orange-900">Status</TableHead>
                    <TableHead className="text-right font-bold text-orange-900">
                      Actions
                    </TableHead>
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
                    <TableRow>
                      <TableCell colSpan={8} />
                    </TableRow>
                  ) : (
                    pagedBuses.map((bus) => (
                      <TableRow
                        key={bus.id}
                        className="transition-colors hover:bg-orange-50/50"
                      >
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {bus.from} to {bus.to}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bus.duration} • {bus.distance} km
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="border-orange-200 bg-orange-100 text-orange-700">
                            {formatBusType(bus.busType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTravelDate(bus.travelDate)}</TableCell>
                        <TableCell>{`${bus.departureTime} to ${bus.arrivalTime}`}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(bus.pricePerSeat)}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {bus.seatsLeft} left / {bus.totalSeats}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bus.bookedSeats.length} booked
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AvailabilityBadge bus={bus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all hover:shadow-lg"
                              onClick={() => {
                                setSelectedBus(bus);
                                setBusDialogOpen(true);
                              }}
                            >
                              <PencilLine className="size-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setStatusBus(bus);
                                setNewStatus((bus as any).departureStatus ?? "scheduled");
                                setNewDelayMinutes((bus as any).delayMinutes ?? 0);
                                setNewStatusNote((bus as any).statusNote ?? "");
                              }}
                            >
                              <Navigation className="size-4" />
                              Status
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => setBusToDelete(bus)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
