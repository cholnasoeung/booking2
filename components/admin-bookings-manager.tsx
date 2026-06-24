"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Download, Eye, Search, Square, Ticket, XCircle } from "lucide-react";

import {
  EmptyState,
  PAGE_SIZE,
  Paginator,
  StatusBadge,
  SummaryTile,
  passengerCountLabel,
  shortBookingId,
} from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmAction, toastSuccess, toastError } from "@/lib/swal";
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
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  formatBusType,
  formatCurrency,
  formatDateTime,
  formatSeatList,
  formatTravelDate,
} from "@/lib/formatters";
import type { AdminBookingSummary, RouteSummary } from "@/lib/queries";



type AdminBookingsManagerProps = {
  routes: RouteSummary[];
  bookings: AdminBookingSummary[];
};

export default function AdminBookingsManager({
  routes,
  bookings,
}: AdminBookingsManagerProps) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] =
    useState<AdminBookingSummary | null>(null);
  const [bookingToCancel, setBookingToCancel] =
    useState<AdminBookingSummary | null>(null);
  const [bookingCancelPending, setBookingCancelPending] = useState(false);
  const [bookingCancellationReason, setBookingCancellationReason] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingRouteFilter, setBookingRouteFilter] = useState("all");
  const [bookingTravelDateFilter, setBookingTravelDateFilter] = useState("");
  const [bookingSort, setBookingSort] = useState("newest");

  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled");
  const totalRevenue = confirmedBookings.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0
  );

  const normalizedQuery = bookingQuery.trim().toLowerCase();
  const visibleBookings = [...bookings]
    .filter((booking) => {
      if (bookingStatusFilter !== "all" && booking.status !== bookingStatusFilter) {
        return false;
      }

      if (
        bookingRouteFilter !== "all" &&
        booking.bus?.routeId !== bookingRouteFilter
      ) {
        return false;
      }

      if (
        bookingTravelDateFilter &&
        booking.bus?.travelDate !== bookingTravelDateFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        booking.id,
        booking.user?.name,
        booking.user?.email,
        booking.bus?.from,
        booking.bus?.to,
        formatSeatList(booking.seats),
        ...booking.passengers.map((passenger) => passenger.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .sort((first, second) => {
      switch (bookingSort) {
        case "oldest":
          return (
            new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
          );
        case "amount-high":
          return second.totalPrice - first.totalPrice;
        case "amount-low":
          return first.totalPrice - second.totalPrice;
        case "status":
          return first.status.localeCompare(second.status);
        case "newest":
        default:
          return (
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
          );
      }
    });

  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(visibleBookings.length / PAGE_SIZE);
  const pagedBookings = visibleBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [bookingQuery, bookingStatusFilter, bookingRouteFilter, bookingTravelDateFilter, bookingSort]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCancelPending, setBulkCancelPending] = useState(false);

  const visibleConfirmedIds = visibleBookings
    .filter((b) => b.status === "confirmed")
    .map((b) => b.id);
  const allVisibleSelected =
    visibleConfirmedIds.length > 0 &&
    visibleConfirmedIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleConfirmedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleConfirmedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id: string, status: string) {
    if (status !== "confirmed") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkCancel() {
    if (selectedIds.size === 0) return;
    if (!(await confirmAction("Cancel Bookings", `Cancel ${selectedIds.size} selected booking(s)?`, "Yes, Cancel"))) return;
    setBulkCancelPending(true);
    try {
      const res = await fetch("/api/admin/bookings/bulk-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingIds: [...selectedIds], reason: "Bulk cancelled by admin" }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toastError(payload.message ?? "Bulk cancel failed");
        return;
      }
      toastSuccess(`Cancelled ${payload.cancelled} booking(s).`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toastError("Bulk cancel failed.");
    } finally {
      setBulkCancelPending(false);
    }
  }

  function exportCsv() {
    const rows = visibleBookings.map((b) => [
      b.id,
      b.status,
      b.user?.name ?? "",
      b.user?.email ?? "",
      b.bus ? `${b.bus.from} to ${b.bus.to}` : "",
      b.bus?.travelDate ?? "",
      b.bus?.departureTime ?? "",
      formatSeatList(b.seats),
      b.seats.length,
      b.totalPrice,
      b.createdAt,
      b.cancelledAt ?? "",
    ]);
    const headers = [
      "BookingID","Status","CustomerName","CustomerEmail","Route","TravelDate",
      "DepartureTime","Seats","SeatCount","TotalPrice","BookedAt","CancelledAt",
    ];
    const escape = (v: any) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmBookingCancellation() {
    if (!bookingToCancel) {
      return;
    }

    setBookingCancelPending(true);
    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: bookingCancellationReason.trim() || undefined }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toastError(payload.message || "Unable to cancel the booking.");
        return;
      }
      toastSuccess("Booking cancelled successfully.");
      setBookingToCancel(null);
      setBookingCancellationReason("");
      if (selectedBooking?.id === bookingToCancel.id) setSelectedBooking(null);
      router.refresh();
    } catch {
      toastError("Unable to cancel the booking right now.");
    } finally {
      setBookingCancelPending(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                    <Ticket className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Customer Bookings</CardTitle>
                    <CardDescription className="text-sm">
                      Search bookings, inspect passenger details, and cancel trips when needed
                    </CardDescription>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="All bookings" value={String(bookings.length)} tone="slate" />
                  <SummaryTile
                    label="Confirmed"
                    value={String(confirmedBookings.length)}
                    tone="slate"
                  />
                  <SummaryTile
                    label="Cancelled"
                    value={String(cancelledBookings.length)}
                    tone="slate"
                  />
                  <SummaryTile
                    label="Revenue"
                    value={formatCurrency(totalRevenue)}
                    tone="slate"
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={bookingQuery}
                    onChange={(event) => setBookingQuery(event.target.value)}
                    placeholder="Search by booking ID, passenger, email, route, or seat"
                    className="h-11 rounded-xl border-slate-200 bg-white/90 pl-9"
                  />
                </div>
                <Select
                  value={bookingStatusFilter}
                  onValueChange={(value) => {
                    if (value) {
                      setBookingStatusFilter(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/90">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={bookingRouteFilter}
                  onValueChange={(value) => {
                    if (value) {
                      setBookingRouteFilter(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white/90">
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
                  value={bookingTravelDateFilter}
                  onChange={(event) => setBookingTravelDateFilter(event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white/90"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select
                  value={bookingSort}
                  onValueChange={(value) => { if (value) setBookingSort(value); }}
                >
                  <SelectTrigger className="h-11 w-full max-w-xs rounded-xl border-slate-200 bg-white/90">
                    <SelectValue placeholder="Sort bookings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="amount-high">Highest amount</SelectItem>
                    <SelectItem value="amount-low">Lowest amount</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                      disabled={bulkCancelPending}
                      onClick={bulkCancel}
                    >
                      <XCircle className="size-4" />
                      {bulkCancelPending ? "Cancelling…" : `Cancel ${selectedIds.size} selected`}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={exportCsv}
                    disabled={visibleBookings.length === 0}
                  >
                    <Download className="size-4" />
                    Export CSV ({visibleBookings.length})
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center"
                        title={allVisibleSelected ? "Deselect all" : "Select all confirmed"}
                      >
                        {allVisibleSelected
                          ? <CheckSquare className="size-4 text-indigo-600" />
                          : <Square className="size-4 text-slate-400" />
                        }
                      </button>
                    </TableHead>
                    <TableHead className="font-bold text-slate-700">Booking</TableHead>
                    <TableHead className="font-bold text-slate-700">Customer</TableHead>
                    <TableHead className="font-bold text-slate-700">Trip</TableHead>
                    <TableHead className="font-bold text-slate-700">Seats</TableHead>
                    <TableHead className="font-bold text-slate-700">Total</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="font-bold text-slate-700">Booked</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10">
                        <EmptyState
                          icon={<Ticket className="size-10 text-slate-300" />}
                          title="No bookings match these filters"
                          description="Try a different search, route, date, or status."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className={`transition-colors hover:bg-slate-50/50 ${selectedIds.has(booking.id) ? "bg-indigo-50/40" : ""}`}
                      >
                        <TableCell>
                          <button
                            type="button"
                            disabled={booking.status !== "confirmed"}
                            onClick={() => toggleRow(booking.id, booking.status)}
                            className="flex items-center justify-center disabled:opacity-30"
                          >
                            {selectedIds.has(booking.id)
                              ? <CheckSquare className="size-4 text-indigo-600" />
                              : <Square className="size-4 text-slate-300" />
                            }
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-mono text-xs text-foreground">
                              {shortBookingId(booking.id)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {passengerCountLabel(booking)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {booking.user?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.user?.email || "No email"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {booking.bus ? (
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {booking.bus.from} to {booking.bus.to}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTravelDate(booking.bus.travelDate)} •{" "}
                                {booking.bus.departureTime}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unavailable</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {formatSeatList(booking.seats)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(booking.totalPrice)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="text-sm text-foreground">
                            {formatDateTime(booking.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <Eye className="size-4" />
                              Details
                            </Button>
                            <Link
                              href={`/booking/confirmation/${booking.id}`}
                              className="inline-flex h-7 items-center justify-center rounded-full border border-border bg-white px-3 text-[0.8rem] font-medium text-foreground transition hover:bg-secondary"
                            >
                              Ticket
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                              disabled={booking.status !== "confirmed"}
                              onClick={() => {
                                setBookingToCancel(booking);
                                setBookingCancellationReason("");
                              }}
                            >
                              <XCircle className="size-4" />
                              Cancel
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
                totalItems={visibleBookings.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl border-2 border-slate-200 bg-white shadow-lg">
          {selectedBooking ? (
            <>
              <DialogHeader className="border-b border-dashed border-slate-200 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <DialogTitle className="text-2xl">Booking Details</DialogTitle>
                    <DialogDescription>
                      Full management view for booking {shortBookingId(selectedBooking.id)}
                    </DialogDescription>
                  </div>
                  <StatusBadge status={selectedBooking.status} />
                </div>
              </DialogHeader>

              <div className="grid gap-4 pt-4 lg:grid-cols-2">
                <DetailCard
                  title="Customer"
                  lines={[
                    selectedBooking.user?.name || "Unknown customer",
                    selectedBooking.user?.email || "No email on file",
                    passengerCountLabel(selectedBooking),
                  ]}
                />
                <DetailCard
                  title="Financials"
                  lines={[
                    `Total: ${formatCurrency(selectedBooking.totalPrice)}`,
                    `Booked on ${formatDateTime(selectedBooking.createdAt)}`,
                    selectedBooking.cancelledAt
                      ? `Cancelled on ${formatDateTime(selectedBooking.cancelledAt)}`
                      : "Currently active",
                  ]}
                />
                <DetailCard
                  title="Trip"
                  lines={
                    selectedBooking.bus
                      ? [
                          `${selectedBooking.bus.from} to ${selectedBooking.bus.to}`,
                          `${formatTravelDate(selectedBooking.bus.travelDate)} • ${selectedBooking.bus.departureTime} to ${selectedBooking.bus.arrivalTime}`,
                          `${formatBusType(selectedBooking.bus.busType)} • ${selectedBooking.bus.duration}`,
                        ]
                      : ["Bus details unavailable", "The linked departure may have been removed."]
                  }
                />
                <DetailCard
                  title="Seats"
                  lines={[
                    formatSeatList(selectedBooking.seats),
                    `${selectedBooking.seats.length} seat${selectedBooking.seats.length === 1 ? "" : "s"} reserved`,
                    selectedBooking.cancellationReason
                      ? `Reason: ${selectedBooking.cancellationReason}`
                      : "No cancellation reason recorded",
                  ]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Passenger Details
                  </h3>
                  <Badge variant="outline">
                    {selectedBooking.passengers.length || selectedBooking.seats.length} listed
                  </Badge>
                </div>

                {selectedBooking.passengers.length > 0 ? (
                  <div className="grid gap-3">
                    {selectedBooking.passengers.map((passenger, index) => (
                      <div
                        key={`${selectedBooking.id}-${index}`}
                        className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{passenger.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {passenger.gender} • Age {passenger.age}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>{passenger.contactNumber}</p>
                            <p>{passenger.email || "No email provided"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-700">
                    Passenger details were not saved for this booking. Older bookings may only have seat selections.
                  </div>
                )}
              </div>

              <DialogFooter className="gap-3">
                <Link
                  href={`/booking/confirmation/${selectedBooking.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  View Ticket
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                  disabled={selectedBooking.status !== "confirmed"}
                  onClick={() => {
                    setBookingToCancel(selectedBooking);
                    setBookingCancellationReason("");
                  }}
                >
                  <XCircle className="size-4" />
                  Cancel Booking
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(open) => {
          if (!open) {
            setBookingToCancel(null);
            setBookingCancellationReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg border-2 border-red-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Cancel Booking</DialogTitle>
            <DialogDescription>
              {bookingToCancel
                ? `Cancel booking ${shortBookingId(bookingToCancel.id)} for ${bookingToCancel.user?.name || "this customer"}?`
                : "Cancel this booking?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="booking-cancel-reason" className="text-sm font-semibold">
              Cancellation reason
            </Label>
            <Textarea
              id="booking-cancel-reason"
              value={bookingCancellationReason}
              onChange={(event) => setBookingCancellationReason(event.target.value)}
              placeholder="Optional note for why this booking is being cancelled"
              className="min-h-24 rounded-xl border-red-200/70 bg-white"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setBookingToCancel(null);
                setBookingCancellationReason("");
              }}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={bookingCancelPending}
              onClick={confirmBookingCancellation}
            >
              {bookingCancelPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={`${title}-${line}`} className="text-sm text-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
