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
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
            >
              {selectedSeats.length} selected
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-800"
            >
              Up to {selectionLimit} seats
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700"
            >
              {formatCurrency(bus.pricePerSeat)} per seat
            </Badge>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Boarding stop</p>
              <Select
                value={boardingStop}
                onValueChange={(value) => value && setBoardingStop(value)}
              >
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
              <Select
                value={droppingStop}
                onValueChange={(value) => value && setDroppingStop(value)}
              >
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
        <CardHeader className="space-y-1">
          <CardTitle>Booking summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review your seats and trip details before moving to the passenger form.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-700/80">
                  Selected seats
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedSeats.length > 0
                    ? "Tap the map to add, remove, or swap seats anytime before continuing."
                    : "Choose one or more open seats from the map to start your booking."}
                </p>
              </div>
              <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
                {selectedSeats.length}/{selectionLimit}
              </span>
            </div>

            {selectedSeats.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSeats.map((seatCode) => (
                    <span
                      key={seatCode}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm"
                    >
                      {seatCode}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {formatSeatList(selectedSeats)}
                </p>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Boarding:</span> {boardingStop}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-900">Drop-off:</span> {droppingStop}
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

            {selectedSeats.length > 0 ? (
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Calculation: {selectedSeats.length} seat
                {selectedSeats.length > 1 ? "s" : ""} x {formatCurrency(bus.pricePerSeat)} ={" "}
                {formatCurrency(totalPrice)}
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-muted-foreground">Total</span>
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
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-lg shadow-rose-200 transition hover:brightness-105"
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
