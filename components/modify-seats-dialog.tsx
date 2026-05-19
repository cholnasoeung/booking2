"use client";

import { useEffect, useState } from "react";

import SeatMap from "@/components/seat-map";
import SleeperSeatMap from "@/components/sleeper-seat-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import type { BookingSummary, BusSummary } from "@/lib/queries";

type ModifySeatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingSummary;
  onModified: () => void;
};

export default function ModifySeatsDialog({
  open,
  onOpenChange,
  booking,
  onModified,
}: ModifySeatsDialogProps) {
  const [busData, setBusData] = useState<BusSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const seatCount = booking.seats.length;

  useEffect(() => {
    if (!open || !booking.bus) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    setSelectedSeats([...booking.seats]);

    fetch(`/api/buses/${booking.bus.id}`)
      .then((res) => res.json())
      .then((data: { bus?: BusSummary; message?: string }) => {
        if (data.bus) {
          setBusData(data.bus);
        } else {
          setError(data.message || "Failed to load bus data.");
        }
      })
      .catch(() => setError("Failed to load bus data."))
      .finally(() => setLoading(false));
  }, [open, booking.bus]);

  function handleSeatToggle(seatCode: string) {
    setSelectedSeats((current) => {
      if (current.includes(seatCode)) {
        return current.filter((s) => s !== seatCode);
      }
      if (current.length >= seatCount) {
        return [...current.slice(1), seatCode];
      }
      return [...current, seatCode];
    });
  }

  async function handleSubmit() {
    if (selectedSeats.length !== seatCount) {
      setError(`Please select exactly ${seatCount} seat(s).`);
      return;
    }

    setPending(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${booking.id}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeSeats", seats: selectedSeats }),
      });

      const payload = (await res.json()) as {
        message?: string;
        modificationFee?: number;
        newSeats?: string[];
      };

      if (!res.ok) {
        setError(payload.message || "Unable to change seats.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    if (success) onModified();
    onOpenChange(false);
    setError("");
    setSuccess(false);
    setBusData(null);
  }

  // Build booked seats excluding user's current seats (so they're available to re-select)
  const effectiveBookedSeats = busData
    ? busData.bookedSeats.filter((s) => !booking.seats.includes(s))
    : [];

  const isSleeperBus = busData?.busType === "sleeper_bus";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Seats updated</DialogTitle>
              <DialogDescription>
                Your seats have been changed to:{" "}
                <strong>{selectedSeats.join(", ")}</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton={false}>
              <Button onClick={handleClose} className="rounded-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Change your seats</DialogTitle>
              <DialogDescription>
                Select {seatCount} seat(s) to replace your current seats (
                {booking.seats.join(", ")}). Changes within 24 h incur a 5%
                fee.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Loading seat map…
                </div>
              )}

              {!loading && busData && (
                <>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Selected:{" "}
                      <strong>
                        {selectedSeats.length} / {seatCount}
                      </strong>
                    </span>
                    {busData.pricePerSeat && (
                      <span className="text-muted-foreground">
                        {formatCurrency(busData.pricePerSeat)} / seat
                      </span>
                    )}
                  </div>

                  {isSleeperBus ? (
                    <SleeperSeatMap
                      layout={busData.seatLayout}
                      bookedSeats={effectiveBookedSeats}
                      blockedSeats={busData.blockedSeats}
                      selectedSeats={selectedSeats}
                      onSeatToggle={handleSeatToggle}
                    />
                  ) : (
                    <SeatMap
                      layout={busData.seatLayout}
                      bookedSeats={effectiveBookedSeats}
                      blockedSeats={busData.blockedSeats}
                      selectedSeats={selectedSeats}
                      onSeatToggle={handleSeatToggle}
                    />
                  )}
                </>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <DialogFooter showCloseButton={false}>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                className="rounded-full"
                onClick={handleSubmit}
                disabled={pending || loading || selectedSeats.length !== seatCount}
              >
                {pending ? "Saving…" : "Confirm new seats"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
