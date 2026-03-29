"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import SeatMap from "@/components/seat-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compareSeatCodes } from "@/lib/seat-layout";
import { formatBusType, formatCurrency, formatSeatList } from "@/lib/formatters";
import type { BusSummary } from "@/lib/queries";

type SeatSelectionProps = {
  bus: BusSummary;
  selectionLimit: number;
};

export default function SeatSelection({
  bus,
  selectionLimit,
}: SeatSelectionProps) {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const totalPrice = selectedSeats.length * bus.pricePerSeat;

  function toggleSeat(seatCode: string) {
    if (bus.bookedSeats.includes(seatCode) || isPending) {
      return;
    }

    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats((current) =>
        current.filter((currentSeat) => currentSeat !== seatCode)
      );
      setError("");
      return;
    }

    if (selectedSeats.length >= selectionLimit) {
      setError(`You can select up to ${selectionLimit} seat(s) for this booking.`);
      return;
    }

    setSelectedSeats((current) => [...current, seatCode].sort(compareSeatCodes));
    setError("");
  }

  async function confirmBooking() {
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busId: bus.id,
          seats: selectedSeats,
        }),
      });

      const payload = (await response.json()) as {
        bookingId?: string;
        message?: string;
      };

      if (!response.ok || !payload.bookingId) {
        setError(payload.message || "Unable to complete your booking.");
        if (response.status === 409) {
          router.refresh();
        }
        return;
      }

      router.push(`/booking/confirmation/${payload.bookingId}`);
      router.refresh();
    } catch {
      setError("Unable to complete your booking right now.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
            <Badge variant="outline">
              {bus.seatsLeft} seat{bus.seatsLeft === 1 ? "" : "s"} left
            </Badge>
          </div>
          <CardTitle>Choose your seats</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick up to {selectionLimit} seat(s). Seat colors update instantly to show
            what&apos;s available, selected, and already taken.
          </p>
        </CardHeader>
        <CardContent>
          <SeatMap
            layout={bus.seatLayout}
            bookedSeats={bus.bookedSeats}
            selectedSeats={selectedSeats}
            disabled={isPending}
            onSeatToggle={toggleSeat}
            showLegend
          />
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader>
          <CardTitle>Booking summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-3xl bg-secondary/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Selected seats
            </p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {selectedSeats.length > 0 ? formatSeatList(selectedSeats) : "None yet"}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bus type</span>
              <span className="font-medium">{formatBusType(bus.busType)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seat count</span>
              <span className="font-medium">{selectedSeats.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price per seat</span>
              <span className="font-medium">{formatCurrency(bus.pricePerSeat)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Total</span>
              <span className="font-heading text-2xl font-semibold text-foreground">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            disabled={isPending || selectedSeats.length === 0 || bus.seatsLeft === 0}
            className="h-11 w-full rounded-2xl"
            onClick={confirmBooking}
          >
            {isPending ? "Confirming..." : "Confirm booking"}
          </Button>

          <p className="text-xs leading-5 text-muted-foreground">
            Seats are confirmed on reservation. If another customer books the same
            seat first, we&apos;ll ask you to pick again before checkout is finished.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
