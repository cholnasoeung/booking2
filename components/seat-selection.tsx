"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUS_SEAT_COLUMNS } from "@/lib/constants";
import { formatCurrency, formatSeatList } from "@/lib/formatters";
import type { BusSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";

type SeatSelectionProps = {
  bus: BusSummary;
  selectionLimit: number;
};

export default function SeatSelection({
  bus,
  selectionLimit,
}: SeatSelectionProps) {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const totalPrice = selectedSeats.length * bus.pricePerSeat;
  const seatNumbers = Array.from({ length: bus.totalSeats }, (_, index) => index + 1);

  function toggleSeat(seatNumber: number) {
    if (bus.bookedSeats.includes(seatNumber) || isPending) {
      return;
    }

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats((current) =>
        current.filter((currentSeat) => currentSeat !== seatNumber)
      );
      setError("");
      return;
    }

    if (selectedSeats.length >= selectionLimit) {
      setError(`You can select up to ${selectionLimit} seat(s) for this booking.`);
      return;
    }

    setSelectedSeats((current) => [...current, seatNumber].sort((a, b) => a - b));
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
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Available</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Green seats
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              Selected seats
            </Badge>
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
              Taken seats
            </Badge>
          </div>
          <CardTitle>Choose your seats</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick up to {selectionLimit} seat(s). The map updates as soon as your
            booking is confirmed.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-2xl rounded-[28px] border border-dashed border-border/80 bg-secondary/60 p-4 sm:p-6">
            <div className="mx-auto mb-6 flex h-12 w-44 items-center justify-center rounded-full bg-background/80 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
              Driver Cabin
            </div>
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                BUS_SEAT_COLUMNS === 4 ? "grid-cols-4" : "grid-cols-4"
              )}
            >
              {seatNumbers.map((seatNumber) => {
                const isBooked = bus.bookedSeats.includes(seatNumber);
                const isSelected = selectedSeats.includes(seatNumber);

                return (
                  <Button
                    key={seatNumber}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-14 rounded-2xl border text-sm font-semibold shadow-none",
                      seatNumber % 4 === 2 ? "mr-4 sm:mr-6" : "",
                      isBooked &&
                        "border-red-200 bg-red-100 text-red-700 hover:bg-red-100",
                      isSelected &&
                        "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100",
                      !isBooked &&
                        !isSelected &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                    disabled={isBooked || isPending}
                    onClick={() => toggleSeat(seatNumber)}
                  >
                    {seatNumber}
                  </Button>
                );
              })}
            </div>
          </div>
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
            seat first, we&apos;ll ask you to pick again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
