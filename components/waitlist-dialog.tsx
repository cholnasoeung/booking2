"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { BusSummary } from "@/lib/queries";

type WaitlistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: BusSummary;
  onJoined: () => void;
};

export default function WaitlistDialog({
  open,
  onOpenChange,
  bus,
  onJoined,
}: WaitlistDialogProps) {
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);

  async function handleJoin() {
    setPending(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId: bus.id,
          routeId: bus.routeId,
          requestedSeats,
          date: bus.travelDate,
          departureTime: bus.departureTime,
          notes: notes.trim(),
        }),
      });

      const payload = (await res.json()) as {
        message?: string;
        entry?: { id: string; position: number };
      };

      if (!res.ok) {
        setError(payload.message || "Unable to join waiting list.");
        return;
      }

      setPosition(payload.entry?.position ?? 1);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    if (position !== null) onJoined();
    onOpenChange(false);
    setRequestedSeats(1);
    setNotes("");
    setError("");
    setPosition(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {position !== null ? (
          <>
            <DialogHeader>
              <DialogTitle>You're on the list!</DialogTitle>
              <DialogDescription>
                You are <strong>#{position}</strong> in the waiting list for{" "}
                <strong>
                  {bus.from} → {bus.to}
                </strong>
                . We'll notify you if seats become available. The entry expires
                in 7 days.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1">
              <p className="text-sm font-semibold text-amber-800">
                {bus.departureTime} · {formatTravelDate(bus.travelDate)}
              </p>
              <p className="text-xs text-amber-700">
                {requestedSeats} seat(s) requested ·{" "}
                {formatCurrency(bus.pricePerSeat)} each
              </p>
            </div>
            <DialogFooter showCloseButton={false}>
              <Button onClick={handleClose} className="rounded-full">
                Got it
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join waiting list</DialogTitle>
              <DialogDescription>
                This bus is full. Join the waiting list and we'll notify you if
                seats open up.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Bus info */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-1">
                <p className="font-semibold text-slate-800">
                  {bus.from} → {bus.to}
                </p>
                <p className="text-sm text-slate-600">
                  {bus.departureTime} – {bus.arrivalTime} ·{" "}
                  {formatTravelDate(bus.travelDate)}
                </p>
                <p className="text-sm text-slate-600">
                  {formatCurrency(bus.pricePerSeat)} per seat
                </p>
              </div>

              {/* Seat count */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Seats needed
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestedSeats((n) => Math.max(1, n - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-lg font-medium"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-semibold">
                    {requestedSeats}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRequestedSeats((n) => Math.min(10, n + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any preferences or special requests?"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>

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
                onClick={handleJoin}
                disabled={pending}
              >
                {pending ? "Joining…" : "Join waitlist"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
