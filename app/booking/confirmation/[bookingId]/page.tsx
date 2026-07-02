import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Download,
  LayoutDashboard,
  Search,
  MapPin,
  Clock,
  Calendar,
  Ticket,
  User,
  ArrowRight,
  Bus,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import {
  formatBusType,
  formatCurrency,
  formatDateTime,
  formatSeatList,
  formatTravelDate,
} from "@/lib/utils/formatters";
import { getBookingSummaryById } from "@/lib/db/queries";
import Navbar from "@/components/layout/navbar";

type ConfirmationPageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { bookingId } = await params;
  const user = await requireUser(
    `/login?callbackUrl=${encodeURIComponent(`/booking/confirmation/${bookingId}`)}`
  );
  const booking = await getBookingSummaryById(bookingId);

  if (!booking) notFound();
  if (user.role !== "admin" && booking.user?.id !== user.id) redirect("/dashboard");

  const isConfirmed = booking.status === "confirmed";
  const bus = booking.bus;

  return (
    <>
      <Navbar />

      {/* Page background */}
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">

          {/* Success / cancelled banner */}
          <div className={`mb-6 flex flex-col items-center text-center`}>
            <div
              className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${
                isConfirmed
                  ? "bg-gradient-to-br from-emerald-400 to-green-600 shadow-emerald-200"
                  : "bg-gradient-to-br from-red-400 to-rose-600 shadow-red-200"
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="h-8 w-8 text-white" />
              ) : (
                <XCircle className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isConfirmed ? "Booking Confirmed!" : "Booking Cancelled"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isConfirmed
                ? "Your ticket is ready. Show it at boarding time."
                : "This booking has been cancelled."}
            </p>
          </div>

          {/* ── Ticket card ── */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-indigo-200/40">

            {/* Ticket header – gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">
                    Ticket number
                  </p>
                  <p className="mt-1 font-mono text-sm text-white/80">{booking.id}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    isConfirmed
                      ? "bg-emerald-400/30 text-emerald-100"
                      : "bg-red-400/30 text-red-100"
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              {/* Route */}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Bus className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{bus?.from ?? "—"}</span>
                  <ArrowRight className="h-5 w-5 text-indigo-300" />
                  <span className="text-xl font-bold">{bus?.to ?? "—"}</span>
                </div>
              </div>
              {bus && (
                <p className="mt-2 text-sm text-indigo-200">
                  {formatBusType(bus.busType)} · {bus.duration} · {bus.distance} km
                </p>
              )}
            </div>

            {/* Perforation notch row */}
            <div className="relative flex h-6 items-center bg-white">
              {/* Left notch */}
              <div className="absolute -left-3 h-6 w-6 rounded-full bg-gradient-to-br from-slate-100 to-indigo-50" />
              {/* Dashed line */}
              <div className="mx-6 flex-1 border-t-2 border-dashed border-slate-200" />
              {/* Right notch */}
              <div className="absolute -right-3 h-6 w-6 rounded-full bg-gradient-to-br from-slate-100 to-indigo-50" />
            </div>

            {/* Ticket body */}
            <div className="px-6 pb-6 pt-2">

              {/* Journey timeline */}
              {bus && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{bus.departureTime}</p>
                    <p className="text-xs text-slate-500">{bus.from}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-1">
                    <div className="h-0.5 flex-1 bg-indigo-200" />
                    <Bus className="h-4 w-4 shrink-0 text-indigo-400" />
                    <div className="h-0.5 flex-1 bg-indigo-200" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{bus.arrivalTime}</p>
                    <p className="text-xs text-slate-500">{bus.to}</p>
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoTile icon={<Calendar className="h-4 w-4" />} label="Travel Date">
                  {bus ? formatTravelDate(bus.travelDate) : "—"}
                </InfoTile>
                <InfoTile icon={<Clock className="h-4 w-4" />} label="Duration">
                  {bus?.duration ?? "—"}
                </InfoTile>
                <InfoTile icon={<Ticket className="h-4 w-4" />} label="Seats">
                  {formatSeatList(booking.seats)}
                </InfoTile>
                <InfoTile icon={<MapPin className="h-4 w-4" />} label="Boarding Stop">
                  {booking.boardingStop ?? bus?.from ?? "—"}
                </InfoTile>
                <InfoTile icon={<MapPin className="h-4 w-4" />} label="Drop-off Stop">
                  {booking.droppingStop ?? bus?.to ?? "—"}
                </InfoTile>
                <InfoTile icon={<User className="h-4 w-4" />} label="Passenger">
                  {booking.user?.name ?? user.name}
                </InfoTile>
              </div>

              {/* Fare row */}
              <div className="mt-4 flex items-end justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Fare
                  </p>
                  <p className="mt-0.5 text-3xl font-extrabold text-indigo-700">
                    {formatCurrency(booking.totalPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Booked on</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDateTime(booking.createdAt)}
                  </p>
                </div>
              </div>

              {/* Barcode-style decoration */}
              <div className="mt-5 flex items-center justify-center gap-px overflow-hidden rounded-xl py-3">
                {Array.from({ length: 52 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-300"
                    style={{
                      width: i % 3 === 0 ? "3px" : "2px",
                      height: i % 5 === 0 ? "36px" : i % 2 === 0 ? "28px" : "20px",
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-slate-400">
                {booking.id.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`/api/bookings/${bookingId}/ticket`}
              download
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-600 hover:to-violet-700"
            >
              <Download className="h-4 w-4" />
              Download Ticket (PDF)
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:opacity-90"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to my bookings
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Search className="h-4 w-4" />
              Search another trip
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-indigo-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800 leading-tight">{children}</p>
      </div>
    </div>
  );
}
