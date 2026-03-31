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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const boardingOptions = bus.stops.filter((stop) => stop.boarding);
  const droppingOptions = bus.stops.filter((stop) => stop.dropping);
  const [boardingStop, setBoardingStop] = useState(
    boardingOptions[0]?.location ?? bus.from
  );
  const [droppingStop, setDroppingStop] = useState(
    droppingOptions[0]?.location ?? bus.to
  );

  const totalPrice = selectedSeats.length * bus.pricePerSeat;

  function toggleSeat(seatCode: string) {
    if (bus.bookedSeats.includes(seatCode) || bus.blockedSeats.includes(seatCode)) {
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

  function proceedToPassengerDetails() {
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return;
    }

    setError("");

    // Redirect to passenger details form with selected seats
    const seatsParam = selectedSeats.join(",");
    const params = new URLSearchParams({
      seats: seatsParam,
      boardingStop,
      droppingStop,
    });
    router.push(`/book/${bus.id}/passengers?${params.toString()}`);
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
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Boarding stop</p>
              <Select value={boardingStop} onValueChange={(value) => value && setBoardingStop(value)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Boarding stop" />
                </SelectTrigger>
                <SelectContent>
                  {boardingOptions.map((stop) => (
                    <SelectItem key={stop.location} value={stop.location}>
                      {stop.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Drop-off stop</p>
              <Select value={droppingStop} onValueChange={(value) => value && setDroppingStop(value)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Drop-off stop" />
                </SelectTrigger>
                <SelectContent>
                  {droppingOptions.map((stop) => (
                    <SelectItem key={stop.location} value={stop.location}>
                      {stop.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SeatMap
            layout={bus.seatLayout}
            bookedSeats={bus.bookedSeats}
            blockedSeats={bus.blockedSeats}
            selectedSeats={selectedSeats}
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

          <div className="rounded-xl bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <p>Boarding at {boardingStop}</p>
            <p>Dropping at {droppingStop}</p>
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
            {selectedSeats.length > 0 && (
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Calculation: {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} × {formatCurrency(bus.pricePerSeat)} = {formatCurrency(totalPrice)}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground font-medium">Total</span>
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
            disabled={selectedSeats.length === 0 || bus.seatsLeft === 0}
            className="h-11 w-full rounded-2xl"
            onClick={proceedToPassengerDetails}
          >
            Continue to Passenger Details
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
