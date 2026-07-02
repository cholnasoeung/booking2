"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Eye, XCircle, MapPin, Clock, Calendar,
  Bus, Ticket, ArrowRight, CheckCircle2, AlertCircle,
  Star, ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { formatBusType, formatCurrency, formatSeatList, formatTravelDate } from "@/lib/utils/formatters";
import type { BookingSummary } from "@/lib/db/queries";

type DashboardBookingsProps = { initialBookings: BookingSummary[] };

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
      <XCircle className="h-3.5 w-3.5" /> Cancelled
    </span>
  );
}

export default function DashboardBookings({ initialBookings }: DashboardBookingsProps) {
  const router  = useRouter();
  const [bookings,     setBookings]     = useState(initialBookings);
  const [cancelTarget, setCancelTarget] = useState<BookingSummary | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error,        setError]        = useState("");
  const [isPending,    startTransition] = useTransition();

  const confirmed  = bookings.filter(b => b.status === "confirmed").length;
  const totalSpent = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + b.totalPrice, 0);
  const today      = new Date();

  function tripIsPast(b: BookingSummary) {
    if (!b.bus?.travelDate) return false;
    return new Date(b.bus.travelDate) < today;
  }

  function openCancel(b: BookingSummary) {
    setCancelTarget(b);
    setCancelReason("");
    setError("");
  }

  function confirmCancel() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    startTransition(async () => {
      setError("");
      try {
        const res = await fetch(`/api/bookings/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason || "Customer requested cancellation" }),
        });
        const payload = await res.json() as { message?: string; refundAmount?: number; refundStatus?: string };
        if (!res.ok) { setError(payload.message || "Unable to cancel booking."); return; }
        setBookings(cur => cur.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
        setCancelTarget(null);
        router.refresh();
      } catch {
        setError("Unable to cancel your booking right now.");
      }
    });
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <Ticket className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No bookings yet</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Once you reserve a bus, your trip summary will appear here.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:opacity-90"
        >
          <Bus className="h-4 w-4" /> Start searching
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Trips</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">Confirmed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{confirmed}</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">Total Spent</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalSpent)}</p>
        </div>
      </div>

      {/* Booking cards */}
      {bookings.map((booking) => {
        const past    = tripIsPast(booking);
        const canRate = booking.status === "confirmed" && past;

        return (
          <div
            key={booking.id}
            className={`relative overflow-hidden rounded-3xl border bg-white shadow-md transition-all hover:shadow-lg ${
              booking.status === "cancelled" ? "border-slate-200 opacity-70" : "border-slate-100"
            }`}
          >
            {/* Top bar */}
            <div className={`h-1.5 w-full ${booking.status === "confirmed" ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-slate-300"}`} />

            <div className="p-5">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                    <Bus className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
                      <span>{booking.bus?.from ?? "—"}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span>{booking.bus?.to ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {booking.bus && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {formatBusType(booking.bus.busType)}
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                      {past && booking.status === "confirmed" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Total paid</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(booking.totalPrice)}</p>
                </div>
              </div>

              {/* Info tiles */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Date</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {booking.bus ? formatTravelDate(booking.bus.travelDate) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Time</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {booking.bus ? `${booking.bus.departureTime} – ${booking.bus.arrivalTime}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Ticket className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Seats</p>
                    <p className="text-xs font-semibold text-slate-700">{formatSeatList(booking.seats)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Booked on</p>
                    <p className="text-xs font-semibold text-slate-700">{formatTravelDate(booking.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Stops */}
              {(booking.boardingStop || booking.droppingStop) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {booking.boardingStop && (
                    <span className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                      <MapPin className="h-3 w-3" /> Board at {booking.boardingStop}
                    </span>
                  )}
                  {booking.droppingStop && (
                    <span className="flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs text-purple-700">
                      <MapPin className="h-3 w-3" /> Drop at {booking.droppingStop}
                    </span>
                  )}
                </div>
              )}

              <div className="my-4 border-t border-dashed border-slate-100" />

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {booking.status === "confirmed" && (
                  <a
                    href={`/api/bookings/${booking.id}/ticket`}
                    download
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:from-indigo-600 hover:to-violet-700"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
                <Link
                  href={`/dashboard/bookings/${booking.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <ExternalLink className="h-4 w-4" /> View Details
                </Link>
                <Link
                  href={`/booking/confirmation/${booking.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <Eye className="h-4 w-4" /> View Ticket
                </Link>
                {canRate && (
                  <Link
                    href={`/dashboard/bookings/${booking.id}#rate`}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    <Star className="h-4 w-4" /> Rate Trip
                  </Link>
                )}
                {booking.status === "confirmed" && !past && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={() => openCancel(booking)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Cancel Confirmation Dialog ── */}
      <Dialog open={!!cancelTarget} onOpenChange={open => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <XCircle className="h-5 w-5 text-red-500" /> Cancel Booking
            </DialogTitle>
            <DialogDescription>
              {cancelTarget?.bus && (
                <span className="font-semibold text-slate-700">
                  {cancelTarget.bus.from} → {cancelTarget.bus.to} on {formatTravelDate(cancelTarget.bus.travelDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Refund policy reminder */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Refund Policy</p>
              <ul className="text-xs space-y-0.5 text-amber-700 list-disc list-inside">
                <li>More than 48 hrs before departure — 100% refund</li>
                <li>24 – 48 hrs before — 75% refund</li>
                <li>4 – 24 hrs before — 50% refund</li>
                <li>Less than 4 hrs before — No refund</li>
              </ul>
            </div>

            {/* Optional reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Reason for cancellation <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Plans changed, booked wrong date…"
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={isPending} className="rounded-full">
              Keep Booking
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={isPending}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              {isPending ? "Cancelling…" : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
