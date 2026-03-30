"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Search, Ticket, XCircle } from "lucide-react";

import {
  EmptyState,
  StatusBadge,
  SummaryTile,
  passengerCountLabel,
  shortBookingId,
} from "@/components/admin-management-shared";
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

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type AdminBookingsManagerProps = {
  routes: RouteSummary[];
  bookings: AdminBookingSummary[];
};

export default function AdminBookingsManager({
  routes,
  bookings,
}: AdminBookingsManagerProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
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

  async function confirmBookingCancellation() {
    if (!bookingToCancel) {
      return;
    }

    setBookingCancelPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: bookingCancellationReason.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: payload.message || "Unable to cancel the booking.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        message: "Booking cancelled successfully.",
      });
      setBookingToCancel(null);
      setBookingCancellationReason("");
      if (selectedBooking?.id === bookingToCancel.id) {
        setSelectedBooking(null);
      }
      router.refresh();
    } catch {
      setFeedback({
        kind: "error",
        message: "Unable to cancel the booking right now.",
      });
    } finally {
      setBookingCancelPending(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {feedback ? (
          <div
            className={
              feedback.kind === "success"
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {feedback.message}
          </div>
        ) : null}

        <Card className="border-2 border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 shadow-xl backdrop-blur-xl">
          <CardHeader className="border-b-2 border-dashed border-pink-200/60 bg-gradient-to-r from-pink-50 to-rose-50">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
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
                  <SummaryTile label="All bookings" value={String(bookings.length)} tone="pink" />
                  <SummaryTile
                    label="Confirmed"
                    value={String(confirmedBookings.length)}
                    tone="pink"
                  />
                  <SummaryTile
                    label="Cancelled"
                    value={String(cancelledBookings.length)}
                    tone="pink"
                  />
                  <SummaryTile
                    label="Revenue"
                    value={formatCurrency(totalRevenue)}
                    tone="pink"
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pink-600/70" />
                  <Input
                    value={bookingQuery}
                    onChange={(event) => setBookingQuery(event.target.value)}
                    placeholder="Search by booking ID, passenger, email, route, or seat"
                    className="h-11 rounded-xl border-pink-200/70 bg-white/90 pl-9"
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
                  <SelectTrigger className="h-11 rounded-xl border-pink-200/70 bg-white/90">
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
                  <SelectTrigger className="h-11 rounded-xl border-pink-200/70 bg-white/90">
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
                  className="h-11 rounded-xl border-pink-200/70 bg-white/90"
                />
              </div>

              <div className="flex justify-end">
                <Select
                  value={bookingSort}
                  onValueChange={(value) => {
                    if (value) {
                      setBookingSort(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 w-full max-w-xs rounded-xl border-pink-200/70 bg-white/90">
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-pink-200/50 bg-white/80">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-pink-50 to-rose-50 hover:bg-transparent">
                    <TableHead className="font-bold text-pink-900">Booking</TableHead>
                    <TableHead className="font-bold text-pink-900">Customer</TableHead>
                    <TableHead className="font-bold text-pink-900">Trip</TableHead>
                    <TableHead className="font-bold text-pink-900">Seats</TableHead>
                    <TableHead className="font-bold text-pink-900">Total</TableHead>
                    <TableHead className="font-bold text-pink-900">Status</TableHead>
                    <TableHead className="font-bold text-pink-900">Booked</TableHead>
                    <TableHead className="text-right font-bold text-pink-900">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10">
                        <EmptyState
                          icon={<Ticket className="size-10 text-pink-300" />}
                          title="No bookings match these filters"
                          description="Try a different search, route, date, or status."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="transition-colors hover:bg-pink-50/50"
                      >
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
                          <Badge className="border-pink-200 bg-pink-100 text-pink-700">
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl border-2 border-pink-200/70 bg-gradient-to-br from-white to-pink-50/50 shadow-2xl">
          {selectedBooking ? (
            <>
              <DialogHeader className="border-b border-dashed border-pink-200/70 pb-4">
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
                        className="rounded-2xl border border-pink-100 bg-white/90 px-4 py-3"
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
                  <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 px-4 py-5 text-sm text-pink-800">
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
    <div className="rounded-2xl border border-pink-100 bg-white/90 p-4">
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
