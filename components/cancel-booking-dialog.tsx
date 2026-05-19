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
import { formatCurrency } from "@/lib/formatters";

const CANCEL_REASONS = [
  "Plans changed",
  "Found a better option",
  "Emergency situation",
  "Booked by mistake",
  "Other",
];

type CancelBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  route: string;
  totalPrice: number;
  onCancelled: () => void;
};

type RefundResult = {
  refundAmount?: number;
  refundStatus?: string;
};

export default function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  route,
  totalPrice,
  onCancelled,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [refundResult, setRefundResult] = useState<RefundResult | null>(null);

  const finalReason = reason === "Other" ? customReason.trim() || "Other" : reason;

  async function handleCancel() {
    setPending(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });

      const payload = (await res.json()) as {
        message?: string;
        refundAmount?: number;
        refundStatus?: string;
      };

      if (!res.ok) {
        setError(payload.message || "Unable to cancel booking.");
        return;
      }

      setRefundResult({
        refundAmount: payload.refundAmount,
        refundStatus: payload.refundStatus,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    if (refundResult) {
      onCancelled();
    }
    onOpenChange(false);
    setReason(CANCEL_REASONS[0]);
    setCustomReason("");
    setError("");
    setRefundResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {refundResult ? (
          <>
            <DialogHeader>
              <DialogTitle>Booking Cancelled</DialogTitle>
              <DialogDescription>
                Your booking for <strong>{route}</strong> has been cancelled.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              {refundResult.refundAmount != null && refundResult.refundAmount > 0 ? (
                <>
                  <p className="text-sm font-semibold text-emerald-800">
                    Refund: {formatCurrency(refundResult.refundAmount)}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Status:{" "}
                    <span className="capitalize">{refundResult.refundStatus ?? "pending"}</span>
                    . Allow 3–7 business days.
                  </p>
                </>
              ) : (
                <p className="text-sm text-emerald-800">No refund applicable for this cancellation.</p>
              )}
            </div>
            <DialogFooter showCloseButton={false}>
              <Button onClick={handleClose} className="rounded-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cancel booking?</DialogTitle>
              <DialogDescription>
                You are about to cancel your trip on <strong>{route}</strong>{" "}
                (paid {formatCurrency(totalPrice)}). This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Reason for cancelling
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        reason === r
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {reason === "Other" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Tell us more (optional)"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                />
              )}

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
                Keep booking
              </Button>
              <Button
                className="rounded-full bg-red-600 text-white hover:bg-red-700"
                onClick={handleCancel}
                disabled={pending}
              >
                {pending ? "Cancelling..." : "Yes, cancel"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
