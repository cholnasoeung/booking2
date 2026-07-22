import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bus, Clock, MapPin,
  Ruler, Ticket, Users, Zap, CheckCircle2,
} from "lucide-react";

import Navbar from "@/components/layout/navbar";
import VehicleGallery from "@/components/common/vehicle-gallery";
import DepartureStatusBadge from "@/components/search/departure-status-badge";
import JoinWaitlistButton from "@/components/booking/join-waitlist-button";
import SeatSelection from "@/components/booking/seat-selection";
import { requireUser } from "@/lib/auth";
import { AMENITY_OPTIONS, MAX_SEATS_PER_BOOKING } from "@/lib/utils/constants";
import { AmenityIcon } from "@/lib/utils/amenity-icons";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/utils/formatters";
import { getBusSummary } from "@/lib/db/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/utils/validation";

type BookPageProps = {
  params: Promise<{ busId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { busId } = await params;
  const query = await searchParams;
  const rawPassengers = getFirstSearchParam(query.passengers);
  const passengers = parsePassengerCount(rawPassengers);
  const callbackUrl = rawPassengers
    ? `/book/${busId}?passengers=${passengers}`
    : `/book/${busId}`;

  await requireUser(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const bus = await getBusSummary(busId);
  if (!bus) notFound();

  const requestedSeats = rawPassengers ? passengers : MAX_SEATS_PER_BOOKING;
  const selectionLimit = bus.seatsLeft > 0 ? Math.min(requestedSeats, bus.seatsLeft) : 1;
  const seatsPercent = bus.totalSeats > 0
    ? Math.round((bus.seatsLeft / bus.totalSeats) * 100)
    : 0;
  const isLow = bus.seatsLeft > 0 && bus.seatsLeft <= 5;

  const backHref = `/search?from=${encodeURIComponent(bus.from)}&to=${encodeURIComponent(bus.to)}&date=${bus.travelDate}&passengers=${passengers}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-zinc-900 text-white shadow-xl">
        {/* Red glow accents — matches the landing page hero */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-red-700/30 blur-3xl" />
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-900" />
        </div>

        <div className="relative w-full px-4 sm:px-6 lg:px-10 py-3.5 lg:py-4">

          {/* Back + label */}
          <div className="mb-3 flex items-center gap-3">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to results
            </Link>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-red-300">
              Seat Selection
            </span>
          </div>

          {/* Route timeline */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="min-w-[64px] shrink-0">
              <p className="text-2xl font-extrabold leading-none sm:text-3xl">{bus.departureTime}</p>
              <p className="mt-1 text-xs font-medium text-white/60">{bus.from}</p>
            </div>

            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-center gap-2">
                <div className="h-px flex-1 bg-white/20" />
                <div className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  {bus.duration}
                </div>
                <div className="h-px flex-1 bg-white/20" />
              </div>
              <p className="text-[10px] text-white/50">{bus.distance} km · Direct</p>
            </div>

            <div className="min-w-[64px] shrink-0 text-right">
              <p className="text-2xl font-extrabold leading-none sm:text-3xl">{bus.arrivalTime}</p>
              <p className="mt-1 text-xs font-medium text-white/60">{bus.to}</p>
            </div>
          </div>

          {/* Meta chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold">
              {formatTravelDate(bus.travelDate)}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold">
              {formatBusType(bus.busType)}
            </span>
            <DepartureStatusBadge
              status={bus.departureStatus}
              delayMinutes={bus.delayMinutes}
              statusNote={bus.statusNote}
            />
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* ── Left: gallery + seat map ── */}
          <div className="min-w-0 space-y-5">

            {/* Vehicle gallery */}
            {bus.busDetail?.images && bus.busDetail.images.length > 0 && (
              <VehicleGallery
                images={bus.busDetail.images}
                vehicleName={bus.busDetail.name ?? "Vehicle"}
              />
            )}

            {/* Seat map / waitlist */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-2.5">
                <h2 className="text-sm font-bold text-slate-900">Choose Your Seats</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select up to {selectionLimit} seat{selectionLimit !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-3.5 sm:p-5">
                {bus.seatsLeft === 0 ? (
                  <JoinWaitlistButton
                    busId={bus.id}
                    routeId={bus.routeId}
                    date={bus.travelDate}
                    departureTime={bus.departureTime}
                    requestedSeats={requestedSeats}
                  />
                ) : (
                  <SeatSelection key={bus.id} bus={bus} selectionLimit={selectionLimit} />
                )}
              </div>
            </div>
          </div>

          {/* ── Right: sticky sidebar ── */}
          <div className="space-y-3.5 lg:sticky lg:top-20 lg:self-start">

            {/* Price summary card */}
            <div className="overflow-hidden rounded-2xl border border-red-100 shadow-md">
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3.5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-200">
                      Price per seat
                    </p>
                    <p className="mt-1 text-3xl font-extrabold leading-none">
                      {formatCurrency(bus.pricePerSeat)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <Bus className="h-5 w-5 text-white/80" />
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={bus.duration} />
                <InfoRow icon={<Ruler className="h-3.5 w-3.5" />} label="Distance" value={`${bus.distance} km`} />
                <InfoRow icon={<Bus className="h-3.5 w-3.5" />} label="Bus type" value={formatBusType(bus.busType)} />
                <InfoRow icon={<Ticket className="h-3.5 w-3.5" />} label="Requested" value={`${requestedSeats} seat${requestedSeats !== 1 ? "s" : ""}`} />
              </div>
            </div>

            {/* Availability */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-red-500" />
                Seat Availability
              </h3>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">Available now</span>
                <span className={`font-bold ${isLow ? "text-amber-600" : bus.seatsLeft === 0 ? "text-red-600" : "text-slate-900"}`}>
                  {bus.seatsLeft} / {bus.totalSeats}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    seatsPercent > 50 ? "bg-emerald-500" : seatsPercent > 20 ? "bg-amber-400" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.max(seatsPercent, bus.seatsLeft > 0 ? 4 : 0)}%` }}
                />
              </div>
              {bus.seatsLeft === 0 && (
                <p className="mt-2 text-xs font-semibold text-red-600">🔴 This departure is sold out</p>
              )}
              {isLow && (
                <p className="mt-2 text-xs font-semibold text-amber-600">
                  ⚡ Only {bus.seatsLeft} seat{bus.seatsLeft !== 1 ? "s" : ""} remaining!
                </p>
              )}
              {bus.seatsLeft < requestedSeats && bus.seatsLeft > 0 && (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Fewer seats available than requested. Your selection limit was adjusted to {bus.seatsLeft}.
                </p>
              )}
            </div>

            {/* Stops */}
            {bus.stops.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Route Stops
                </h3>
                <div className="relative space-y-0">
                  {bus.stops.map((stop, i) => (
                    <div key={stop.location} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold ${
                          stop.boarding
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-sky-400 bg-sky-400 text-white"
                        }`}>
                          {i + 1}
                        </div>
                        {i < bus.stops.length - 1 && (
                          <div className="my-1 h-5 w-px bg-slate-200" />
                        )}
                      </div>
                      <div className="pb-3 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{stop.location}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${
                          stop.boarding ? "text-red-500" : "text-sky-500"
                        }`}>
                          {stop.boarding ? "Boarding" : ""}
                          {stop.boarding && stop.dropping ? " / " : ""}
                          {stop.dropping ? "Drop-off" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {bus.amenities && bus.amenities.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Zap className="h-4 w-4 text-red-500" />
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {bus.amenities.map((amenity) => {
                    const info = AMENITY_OPTIONS.find((o) => o.value === amenity);
                    return (
                      <span
                        key={amenity}
                        className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                      >
                        <AmenityIcon value={amenity} className="size-3.5" />
                        {info?.label ?? amenity}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Booking policy */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-red-500" />
                Booking Policy
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  Select your seats, then confirm from the summary card that appears below the seat map.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  If another traveller books the same seat simultaneously, you will be prompted to re-select before checkout.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  Cancellation refunds: 100% &gt;48 h · 75% &gt;24 h · 50% &gt;4 h · 0% &lt;4 h.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <span className="text-red-400">{icon}</span>
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}
