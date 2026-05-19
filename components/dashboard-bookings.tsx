"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CancelBookingDialog from "@/components/cancel-booking-dialog";
import ModifySeatsDialog from "@/components/modify-seats-dialog";
import RateBookingDialog from "@/components/rate-booking-dialog";
import {
  formatBusType,
  formatCurrency,
  formatSeatList,
  formatTravelDate,
} from "@/lib/formatters";
import type { BookingSummary } from "@/lib/queries";

type DashboardBookingsProps = {
  initialBookings: BookingSummary[];
};

function isPastTrip(travelDate?: string | null): boolean {
  if (!travelDate) return false;
  return new Date(travelDate) < new Date(new Date().toDateString());
}

export default function DashboardBookings({
  initialBookings,
}: DashboardBookingsProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    bookingId: string;
    route: string;
    totalPrice: number;
  } | null>(null);

  const [modifyDialog, setModifyDialog] = useState<{
    open: boolean;
    booking: BookingSummary;
  } | null>(null);

  const [rateDialog, setRateDialog] = useState<{
    open: boolean;
    bookingId: string;
    busId: string;
    route: string;
  } | null>(null);

  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  function handleCancelled(bookingId: string) {
    setBookings((current) =>
      current.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" } : b
      )
    );
    router.refresh();
  }

  function handleModified() {
    router.refresh();
  }

  function handleRated(bookingId: string) {
    setRatedIds((prev) => new Set([...prev, bookingId]));
  }

  if (bookings.length === 0) {
    return (
      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader>
          <CardTitle>No bookings yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Once you reserve a bus, your trip summary will appear here with seat
            details and status updates.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
          >
            Start searching
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Loyalty link */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/loyalty"
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
        >
          <span>🏆</span>
          View loyalty points
        </Link>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => {
          const route = booking.bus
            ? `${booking.bus.from} to ${booking.bus.to}`
            : "Unknown route";
          const canCancel = booking.status === "confirmed";
          const canModify = booking.status === "confirmed" && !isPastTrip(booking.bus?.travelDate);
          const canRate =
            booking.status === "confirmed" &&
            isPastTrip(booking.bus?.travelDate) &&
            !ratedIds.has(booking.id);
          const isCancelled = booking.status === "cancelled";
          const canRebook = !!booking.bus;

          return (
            <Card
              key={booking.id}
              className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5"
            >
              <CardContent className="grid gap-5 py-6 lg:grid-cols-[1.7fr_0.8fr_0.8fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-heading text-xl font-semibold text-foreground">
                      {route}
                    </p>
                    {booking.bus ? (
                      <Badge variant="outline">
                        {formatBusType(booking.bus.busType)}
                      </Badge>
                    ) : null}
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "secondary" : "outline"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.bus
                      ? `${formatTravelDate(booking.bus.travelDate)} | ${booking.bus.departureTime} to ${booking.bus.arrivalTime}`
                      : "Bus details are no longer available."}
                  </p>
                  {booking.boardingStop ? (
                    <p className="text-sm text-muted-foreground">
                      Board at {booking.boardingStop}
                    </p>
                  ) : null}
                  {booking.droppingStop ? (
                    <p className="text-sm text-muted-foreground">
                      Drop at {booking.droppingStop}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Seats {formatSeatList(booking.seats)}
                  </p>

                  {/* Refund tracker */}
                  {isCancelled && (
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                      booking.refundStatus === "processed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : booking.refundAmount && booking.refundAmount > 0
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}>
                      {booking.refundStatus === "processed" ? "✓ Refund processed" :
                       booking.refundAmount && booking.refundAmount > 0
                         ? `⏳ Refund ${formatCurrency(booking.refundAmount)} pending`
                         : "No refund applicable"}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Total paid
                  </p>
                  <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                    {formatCurrency(booking.totalPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Booked on
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatTravelDate(booking.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {/* Download */}
                  <a
                    href={`/api/bookings/${booking.id}/ticket`}
                    download
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </a>

                  {/* View ticket */}
                  <Link
                    href={`/booking/confirmation/${booking.id}`}
                    className="rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                  >
                    View
                  </Link>

                  {/* Rebook */}
                  {canRebook && (isCancelled || isPastTrip(booking.bus?.travelDate)) && (
                    <Link
                      href={`/book/${booking.bus!.id}?passengers=${booking.seats.length}`}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                      Rebook
                    </Link>
                  )}

                  {/* Modify seats */}
                  {canModify && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full px-3 text-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() =>
                        setModifyDialog({ open: true, booking })
                      }
                    >
                      Change seats
                    </Button>
                  )}

                  {/* Rate trip */}
                  {canRate && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full px-3 text-sm border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() =>
                        setRateDialog({
                          open: true,
                          bookingId: booking.id,
                          busId: booking.bus?.id ?? "",
                          route,
                        })
                      }
                    >
                      ★ Rate trip
                    </Button>
                  )}

                  {ratedIds.has(booking.id) && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      Reviewed
                    </span>
                  )}

                  {/* Cancel */}
                  {canCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full px-3 text-sm border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() =>
                        setCancelDialog({
                          open: true,
                          bookingId: booking.id,
                          route,
                          totalPrice: booking.totalPrice,
                        })
                      }
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      {cancelDialog && (
        <CancelBookingDialog
          open={cancelDialog.open}
          onOpenChange={(open) =>
            setCancelDialog((prev) => prev && { ...prev, open })
          }
          bookingId={cancelDialog.bookingId}
          route={cancelDialog.route}
          totalPrice={cancelDialog.totalPrice}
          onCancelled={() => handleCancelled(cancelDialog.bookingId)}
        />
      )}

      {modifyDialog && (
        <ModifySeatsDialog
          open={modifyDialog.open}
          onOpenChange={(open) =>
            setModifyDialog((prev) => prev && { ...prev, open })
          }
          booking={modifyDialog.booking}
          onModified={handleModified}
        />
      )}

      {rateDialog && (
        <RateBookingDialog
          open={rateDialog.open}
          onOpenChange={(open) =>
            setRateDialog((prev) => prev && { ...prev, open })
          }
          bookingId={rateDialog.bookingId}
          busId={rateDialog.busId}
          route={rateDialog.route}
          onRated={() => handleRated(rateDialog.bookingId)}
        />
      )}
    </>
  );
}
