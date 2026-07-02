import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  AlertCircle, ArrowLeft, ArrowRight, Bus, Calendar, CheckCircle2,
  Clock, Download, MapPin, Star, Ticket, Users, XCircle,
} from "lucide-react";

import Navbar from "@/components/layout/navbar";
import BookingDetailActions from "@/components/booking/booking-detail-actions";
import { requireUser } from "@/lib/auth";
import { getBookingSummaryById } from "@/lib/db/queries";
import { isValidObjectId } from "@/lib/utils/validation";
import {
  formatBusType, formatCurrency, formatDateTime,
  formatSeatList, formatTravelDate,
} from "@/lib/utils/formatters";

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const user = await requireUser(
    `/login?callbackUrl=${encodeURIComponent(`/dashboard/bookings/${id}`)}`
  );
  const booking = await getBookingSummaryById(id);
  if (!booking) notFound();
  if (user.role !== "admin" && booking.user?.id !== user.id) redirect("/dashboard");

  const bus = booking.bus;
  const isConfirmed = booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";

  const tripDate = bus?.travelDate ? new Date(bus.travelDate) : null;
  const tripIsPast = tripDate ? tripDate < new Date() : false;
  const canRate = isConfirmed && tripIsPast;

  const qrDataUrl = await QRCode.toDataURL(
    `BOOKING:${booking.id}`,
    { width: 180, margin: 1, color: { dark: "#312e81", light: "#ffffff" } }
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Back */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to My Bookings
          </Link>

          {/* ── Main ticket card ── */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-indigo-100/50 border border-indigo-100/60">

            {/* Header */}
            <div className={`px-6 py-5 text-white ${isConfirmed ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-slate-500 to-slate-600"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Booking ID</p>
                  <p className="mt-1 font-mono text-sm text-white/80 break-all">{booking.id}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${isConfirmed ? "bg-emerald-400/25 text-emerald-100" : "bg-red-400/25 text-red-100"}`}>
                  {isConfirmed ? "✓ Confirmed" : "✕ Cancelled"}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{bus?.from ?? "—"}</span>
                  <ArrowRight className="h-5 w-5 text-indigo-300" />
                  <span className="text-2xl font-bold">{bus?.to ?? "—"}</span>
                </div>
              </div>
              {bus && (
                <p className="mt-1.5 text-sm text-indigo-200">
                  {formatBusType(bus.busType)} · {bus.duration} · {bus.distance} km
                </p>
              )}
            </div>

            {/* Perforation */}
            <div className="relative flex h-5 items-center bg-white">
              <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-slate-100" />
              <div className="mx-6 flex-1 border-t-2 border-dashed border-slate-200" />
              <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-slate-100" />
            </div>

            {/* Body: info + QR */}
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-5 min-w-0">

                {/* Journey timeline */}
                {bus && (
                  <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3.5">
                    <div className="text-center min-w-[64px]">
                      <p className="text-xl font-bold text-slate-900">{bus.departureTime}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{bus.from}</p>
                    </div>
                    <div className="flex flex-1 items-center gap-1.5">
                      <div className="h-px flex-1 bg-indigo-200" />
                      <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">
                        <Bus className="h-3 w-3" /> {bus.duration}
                      </span>
                      <div className="h-px flex-1 bg-indigo-200" />
                    </div>
                    <div className="text-center min-w-[64px]">
                      <p className="text-xl font-bold text-slate-900">{bus.arrivalTime}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{bus.to}</p>
                    </div>
                  </div>
                )}

                {/* Info tiles */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoTile icon={<Calendar className="h-4 w-4" />} label="Travel Date">
                    {bus ? formatTravelDate(bus.travelDate) : "—"}
                  </InfoTile>
                  <InfoTile icon={<Ticket className="h-4 w-4" />} label="Seats">
                    {formatSeatList(booking.seats)}
                  </InfoTile>
                  <InfoTile icon={<Users className="h-4 w-4" />} label="Passengers">
                    {booking.passengers.length} {booking.passengers.length === 1 ? "person" : "people"}
                  </InfoTile>
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="Boarding">
                    {booking.boardingStop ?? bus?.from ?? "—"}
                  </InfoTile>
                  <InfoTile icon={<MapPin className="h-4 w-4" />} label="Drop-off">
                    {booking.droppingStop ?? bus?.to ?? "—"}
                  </InfoTile>
                  <InfoTile icon={<Clock className="h-4 w-4" />} label="Booked on">
                    {formatDateTime(booking.createdAt)}
                  </InfoTile>
                </div>

                {/* Fare */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Fare</p>
                      <p className="mt-0.5 text-3xl font-extrabold text-indigo-700">
                        {formatCurrency(booking.totalPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Payment</p>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        {isConfirmed
                          ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600">Paid</span></>
                          : <><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-red-600">Refunded</span></>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cancellation banner */}
                {isCancelled && (booking.cancelledAt || booking.cancellationReason) && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Cancellation Details</p>
                      {booking.cancellationReason && (
                        <p className="mt-1 text-sm text-red-600">{booking.cancellationReason}</p>
                      )}
                      {booking.cancelledAt && (
                        <p className="mt-0.5 text-xs text-red-400">
                          Cancelled on {formatDateTime(booking.cancelledAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="rounded-2xl border-2 border-indigo-100 bg-white p-3 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Booking QR Code" width={180} height={180} className="rounded-lg block" />
                </div>
                <p className="text-[10px] font-mono text-slate-400 tracking-widest text-center">Scan at boarding</p>
              </div>
            </div>
          </div>

          {/* ── Passenger list ── */}
          {booking.passengers.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white shadow-md p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                <Users className="h-5 w-5 text-indigo-500" />
                Passenger Details
              </h2>
              <div className="space-y-3">
                {booking.passengers.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)} · Age {p.age}
                        {p.contactNumber && ` · ${p.contactNumber}`}
                        {p.email && ` · ${p.email}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Seat</p>
                      <p className="text-sm font-bold text-indigo-600">{booking.seats[i] ?? "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action buttons (client component for review dialog) ── */}
          <BookingDetailActions
            bookingId={booking.id}
            busId={bus?.id ?? ""}
            isConfirmed={isConfirmed}
            canRate={canRate}
          />
        </div>
      </div>
    </>
  );
}

function InfoTile({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-indigo-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{children}</p>
      </div>
    </div>
  );
}
