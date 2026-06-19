"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  XCircle,
  MapPin,
  Clock,
  Calendar,
  Bus,
  Ticket,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBusType, formatCurrency, formatSeatList, formatTravelDate } from "@/lib/formatters";
import type { BookingSummary } from "@/lib/queries";

type DashboardBookingsProps = {
  initialBookings: BookingSummary[];
};

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
      <XCircle className="h-3.5 w-3.5" />
      Cancelled
    </span>
  );
}

export default function DashboardBookings({ initialBookings }: DashboardBookingsProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const totalSpent = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  async function cancelBooking(bookingId: string) {
    setPendingId(bookingId);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message || "Unable to cancel your booking.");
        return;
      }
      setBookings((current) =>
        current.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
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
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <Ticket className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No bookings yet</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Once you reserve a bus, your trip summary will appear here with seat details and status updates.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:opacity-90"
        >
          <Bus className="h-4 w-4" />
          Start searching
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
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

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Booking cards */}
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className={`relative overflow-hidden rounded-3xl border bg-white shadow-md transition-all hover:shadow-lg ${
            booking.status === "cancelled"
              ? "border-slate-200 opacity-70"
              : "border-slate-100"
          }`}
        >
          {/* Top color bar */}
          <div
            className={`h-1.5 w-full ${
              booking.status === "confirmed"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                : "bg-slate-300"
            }`}
          />

          <div className="p-5">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* Route */}
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
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-slate-400">Total paid</p>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(booking.totalPrice)}</p>
              </div>
            </div>

            {/* Info grid */}
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

            {/* Boarding / dropping stops */}
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

            {/* Divider */}
            <div className="my-4 border-t border-dashed border-slate-100" />

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/bookings/${booking.id}/ticket`}
                download
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <Link
                href={`/booking/confirmation/${booking.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Eye className="h-4 w-4" />
                View ticket
              </Link>
              {booking.status === "confirmed" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 ml-auto"
                  disabled={pendingId === booking.id}
                  onClick={() => cancelBooking(booking.id)}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {pendingId === booking.id ? "Cancelling…" : "Cancel"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
