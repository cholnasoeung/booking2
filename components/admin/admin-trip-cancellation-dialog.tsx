"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, Users, DollarSign, XCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/formatters";
import { toastSuccess, toastError } from "@/lib/utils/swal";

type Preview = {
  busId: string;
  route: string;
  date: string;
  departureTime: string;
  departureStatus: string;
  affectedBookings: number;
  totalRefund: number;
  passengers: { name: string; email: string | null; seats: string[]; finalPrice: number }[];
};

type Props = {
  busId: string | null;
  busLabel?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCancelled?: () => void;
};

export default function AdminTripCancellationDialog({
  busId, busLabel, open, onOpenChange, onCancelled,
}: Props) {
  const [preview, setPreview]   = useState<Preview | null>(null);
  const [loading, setLoading]   = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone]         = useState(false);
  const [reason, setReason]     = useState("");
  const [result, setResult]     = useState<{ affectedBookings: number; totalRefund: number; emailsSent: number } | null>(null);

  useEffect(() => {
    if (!open || !busId) { setPreview(null); setDone(false); setResult(null); setReason(""); return; }
    setLoading(true);
    fetch(`/api/admin/buses/${busId}/cancel`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => toastError("Failed to load trip details"))
      .finally(() => setLoading(false));
  }, [open, busId]);

  async function handleCancel() {
    if (!busId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/buses/${busId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || "Service cancelled by operator" }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to cancel"); return; }
      setResult(json);
      setDone(true);
      toastSuccess("Departure cancelled and passengers notified");
      onCancelled?.();
    } catch {
      toastError("Request failed");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <XCircle className="h-5 w-5 text-red-500" />
            Cancel Departure
          </DialogTitle>
          <DialogDescription>
            {busLabel && <span className="font-medium text-slate-700">{busLabel}</span>}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && done && result && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-emerald-800">Departure Cancelled</p>
              <p className="text-sm text-emerald-700 mt-1">
                {result.affectedBookings} booking{result.affectedBookings !== 1 ? "s" : ""} cancelled ·{" "}
                {formatCurrency(result.totalRefund)} refunded ·{" "}
                {result.emailsSent} email{result.emailsSent !== 1 ? "s" : ""} sent
              </p>
            </div>
            <Button className="w-full rounded-xl" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {!loading && !done && preview && (
          <div className="space-y-4 py-2">
            {preview.departureStatus === "cancelled" ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
                ⚠ This departure is already cancelled.
              </div>
            ) : (
              <>
                {/* Warning banner */}
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    This will cancel the entire departure and automatically refund all passengers.
                    This action cannot be undone.
                  </p>
                </div>

                {/* Trip info */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
                  <p className="font-semibold text-slate-900">{preview.route}</p>
                  <p className="text-sm text-slate-500">{preview.date} · Departure {preview.departureTime}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Passengers</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-800">{preview.affectedBookings}</p>
                    <p className="text-xs text-amber-600 mt-0.5">bookings affected</p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Total Refund</span>
                    </div>
                    <p className="text-2xl font-bold text-red-800">{formatCurrency(preview.totalRefund)}</p>
                    <p className="text-xs text-red-600 mt-0.5">will be processed</p>
                  </div>
                </div>

                {/* Passenger list (collapsed if many) */}
                {preview.passengers.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <p className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Passengers to notify ({preview.passengers.length})
                    </p>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {preview.passengers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div>
                            <p className="font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.email ?? "No email"} · Seats: {p.seats.join(", ")}</p>
                          </div>
                          <span className="text-slate-700 font-semibold text-xs">{formatCurrency(p.finalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Cancellation Reason <span className="text-slate-400 font-normal">(sent to passengers)</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. Vehicle breakdown, severe weather conditions…"
                    className="rounded-xl resize-none h-20"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {!loading && !done && preview && preview.departureStatus !== "cancelled" && (
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Keep Departure
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold gap-2"
            >
              {cancelling ? <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling…</> : <><XCircle className="h-4 w-4" /> Confirm Cancellation</>}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
