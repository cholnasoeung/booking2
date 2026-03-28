"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatSeatList, formatTravelDate } from "@/lib/formatters";
import type { BookingSummary } from "@/lib/queries";

type DashboardBookingsProps = {
  initialBookings: BookingSummary[];
};

export default function DashboardBookings({
  initialBookings,
}: DashboardBookingsProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cancelBooking(bookingId: string) {
    setPendingId(bookingId);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Unable to cancel your booking.");
        return;
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: "cancelled",
              }
            : booking
        )
      );
      router.refresh();
    } catch {
      setError("Unable to cancel your booking right now.");
    } finally {
      setPendingId(null);
    }
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
    <div className="space-y-4">
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {bookings.map((booking) => (
        <Card
          key={booking.id}
          className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5"
        >
          <CardContent className="grid gap-5 py-6 lg:grid-cols-[1.7fr_0.8fr_0.8fr_auto]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-heading text-xl font-semibold text-foreground">
                  {booking.bus
                    ? `${booking.bus.from} to ${booking.bus.to}`
                    : "Route unavailable"}
                </p>
                <Badge
                  variant={booking.status === "confirmed" ? "secondary" : "outline"}
                >
                  {booking.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.bus
                  ? `${formatTravelDate(booking.bus.travelDate)} • ${booking.bus.departureTime} to ${booking.bus.arrivalTime}`
                  : "Bus details are no longer available."}
              </p>
              <p className="text-sm text-muted-foreground">
                Seats {formatSeatList(booking.seats)}
              </p>
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

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Link
                href={`/booking/confirmation/${booking.id}`}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                View ticket
              </Link>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                disabled={booking.status !== "confirmed" || pendingId === booking.id}
                onClick={() => cancelBooking(booking.id)}
              >
                {pendingId === booking.id ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
