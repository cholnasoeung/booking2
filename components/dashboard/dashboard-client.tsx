"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bus, User, Star, LogOut, Ticket, MapPin, Clock, Calendar,
  Download, Eye, XCircle, CheckCircle2, AlertCircle, ArrowRight,
  ChevronDown, ChevronUp, ExternalLink, TrendingUp, CheckCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import LoyaltyCard from "@/components/dashboard/loyalty-card";
import WaitlistCard from "@/components/booking/waitlist-card";
import { formatBusType, formatCurrency, formatSeatList, formatTravelDate } from "@/lib/utils/formatters";
import type { BookingSummary } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type Props = {
  user: { id: string; name: string; email: string };
  initialBookings: BookingSummary[];
};

type Tab = "bookings" | "loyalty" | "waitlist";

export default function DashboardClient({ user, initialBookings }: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("bookings");
  const [bookings, setBookings]     = useState(initialBookings);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingSummary | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError]           = useState("");
  const [isPending, startTransition] = useTransition();

  const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const confirmed  = bookings.filter((b) => b.status === "confirmed").length;
  const totalSpent = bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.totalPrice, 0);
  const today      = new Date();

  function tripIsPast(b: BookingSummary) {
    return b.bus?.travelDate ? new Date(b.bus.travelDate) < today : false;
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
        const payload = await res.json();
        if (!res.ok) { setError(payload.message || "Unable to cancel."); return; }
        setBookings((cur) => cur.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
        setCancelTarget(null);
        router.refresh();
      } catch {
        setError("Unable to cancel your booking right now.");
      }
    });
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "bookings", label: "My Trips",     count: bookings.length },
    { key: "loyalty",  label: "Loyalty"                              },
    { key: "waitlist", label: "Waitlist"                             },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Compact Hero ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pt-6 pb-0 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-violet-500 to-purple-600 text-lg font-black text-white shadow-lg ring-2 ring-white/20">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-indigo-300/70 uppercase tracking-widest">Welcome back</p>
                <h1 className="text-lg font-black text-white leading-tight">{user.name}</h1>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow transition">
                <Bus className="h-3.5 w-3.5" /> Book Trip
              </Link>
              <Link href="/dashboard/profile" className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/[0.12] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] transition">
                <User className="h-4 w-4" />
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/[0.12] bg-white/[0.06] text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-sm font-black text-white">{bookings.length}</span>
              <span className="text-[11px] text-slate-500 font-medium">trips</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm font-black text-emerald-400">{confirmed}</span>
              <span className="text-[11px] text-slate-500 font-medium">confirmed</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-black text-violet-300 font-mono">{formatCurrency(totalSpent)}</span>
              <span className="text-[11px] text-slate-500 font-medium">spent</span>
            </div>
          </div>

          {/* Tab bar — sits on the hero bottom edge */}
          <div className="mt-5 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-t border-x",
                  tab === t.key
                    ? "bg-slate-50 text-indigo-700 border-slate-200 shadow-sm"
                    : "text-slate-400 border-transparent hover:text-slate-200"
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn(
                    "text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                    tab === t.key ? "bg-indigo-100 text-indigo-600" : "bg-white/10 text-slate-400"
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">

        {/* BOOKINGS TAB */}
        {tab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
                  <Ticket className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No bookings yet</h3>
                <p className="mt-1.5 max-w-xs text-sm text-slate-500">Book your first trip and it will appear here.</p>
                <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:opacity-90">
                  <Bus className="h-4 w-4" /> Search Buses
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {bookings.map((booking, idx) => {
                  const past       = tripIsPast(booking);
                  const isConfirmed = booking.status === "confirmed";
                  const canRate    = isConfirmed && past;
                  const isExpanded = expanded === booking.id;

                  return (
                    <div key={booking.id} className={cn("border-b border-slate-100 last:border-b-0", !isConfirmed && "opacity-60")}>
                      {/* Compact row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setExpanded(isExpanded ? null : booking.id)}
                      >
                        {/* Status dot */}
                        <div className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          isConfirmed ? "bg-emerald-500" : "bg-red-400"
                        )} />

                        {/* Route */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-bold text-slate-800 text-sm truncate">{booking.bus?.from ?? "—"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                          <span className="font-bold text-slate-800 text-sm truncate">{booking.bus?.to ?? "—"}</span>
                        </div>

                        {/* Date */}
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-slate-300" />
                          {booking.bus ? formatTravelDate(booking.bus.travelDate) : "—"}
                        </div>

                        {/* Status badge */}
                        <span className={cn(
                          "hidden md:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                          isConfirmed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        )}>
                          {isConfirmed ? "Confirmed" : "Cancelled"}
                        </span>

                        {/* Price */}
                        <span className="font-black text-indigo-600 text-sm font-mono shrink-0 w-16 text-right">
                          {formatCurrency(booking.totalPrice)}
                        </span>

                        {/* Expand chevron */}
                        <div className="text-slate-300 shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                          {/* Info tiles */}
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <InfoTile icon={<Calendar className="h-3.5 w-3.5 text-indigo-400" />} label="Date"
                              value={booking.bus ? formatTravelDate(booking.bus.travelDate) : "—"} />
                            <InfoTile icon={<Clock className="h-3.5 w-3.5 text-violet-400" />} label="Time"
                              value={booking.bus ? `${booking.bus.departureTime} – ${booking.bus.arrivalTime}` : "—"} />
                            <InfoTile icon={<Ticket className="h-3.5 w-3.5 text-pink-400" />} label="Seats"
                              value={formatSeatList(booking.seats)} />
                            <InfoTile icon={<Bus className="h-3.5 w-3.5 text-amber-400" />} label="Bus type"
                              value={booking.bus ? formatBusType(booking.bus.busType) : "—"} />
                          </div>

                          {/* Stops */}
                          {(booking.boardingStop || booking.droppingStop) && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {booking.boardingStop && (
                                <span className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                  <MapPin className="h-3 w-3" /> Board: {booking.boardingStop}
                                </span>
                              )}
                              {booking.droppingStop && (
                                <span className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                                  <MapPin className="h-3 w-3" /> Drop: {booking.droppingStop}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {isConfirmed && (
                              <a href={`/api/bookings/${booking.id}/ticket`} download
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            )}
                            <Link href={`/dashboard/bookings/${booking.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 transition">
                              <ExternalLink className="h-3.5 w-3.5" /> Details
                            </Link>
                            <Link href={`/booking/confirmation/${booking.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 transition">
                              <Eye className="h-3.5 w-3.5" /> Ticket
                            </Link>
                            {canRate && (
                              <Link href={`/dashboard/bookings/${booking.id}#rate`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition">
                                <Star className="h-3.5 w-3.5" /> Rate Trip
                              </Link>
                            )}
                            {isConfirmed && !past && (
                              <button onClick={() => openCancel(booking)}
                                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition">
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LOYALTY TAB */}
        {tab === "loyalty" && (
          <div className="max-w-xl">
            <LoyaltyCard />
          </div>
        )}

        {/* WAITLIST TAB */}
        {tab === "waitlist" && (
          <div className="max-w-xl">
            <WaitlistCard />
          </div>
        )}
      </div>

      {/* ── Cancel Dialog ── */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Refund Policy</p>
              <ul className="text-xs space-y-0.5 text-amber-700 list-disc list-inside">
                <li>More than 48 hrs — 100% refund</li>
                <li>24–48 hrs — 75% refund</li>
                <li>4–24 hrs — 50% refund</li>
                <li>Less than 4 hrs — No refund</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Plans changed…" rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40" />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={isPending} className="rounded-xl">Keep Booking</Button>
            <Button onClick={confirmCancel} disabled={isPending} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              <XCircle className="h-4 w-4 mr-1.5" />
              {isPending ? "Cancelling…" : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2">
      {icon}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
        <p className="text-xs font-bold text-slate-700 mt-0.5 leading-tight">{value}</p>
      </div>
    </div>
  );
}
