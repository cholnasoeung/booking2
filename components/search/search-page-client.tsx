"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal, ArrowRight, MapPin, Star, Zap,
} from "lucide-react";

import SearchFilters, {
  type FilterState,
  TIME_SLOTS,
} from "@/components/search/search-filters";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/search/search-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DepartureStatusBadge from "@/components/search/departure-status-badge";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/utils/formatters";
import type { BusSummary } from "@/lib/db/queries";

type SearchPageClientProps = {
  initialBuses: BusSummary[];
  from: string;
  to: string;
  date: string;
  passengers: number;
  returnDate?: string;
  returnBuses?: BusSummary[];
};

export default function SearchPageClient({
  initialBuses,
  from,
  to,
  date,
  passengers,
  returnDate,
  returnBuses = [],
}: SearchPageClientProps) {
  const router = useRouter();

  const prices = initialBuses.map((b) => b.pricePerSeat);
  const minPrice = Math.min(...prices, 0);
  const maxPrice = Math.max(...prices, 100);

  const [filters, setFilters] = useState<FilterState>({
    busType: "all",
    priceRange: [minPrice, maxPrice],
    timeSlots: [],
    amenities: [],
  });
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "departure">("departure");

  const filteredBuses = useMemo(() => {
    let f = [...initialBuses];
    if (filters.busType !== "all") f = f.filter((b) => b.busType === filters.busType);
    f = f.filter((b) => b.pricePerSeat >= filters.priceRange[0] && b.pricePerSeat <= filters.priceRange[1]);
    if (filters.timeSlots.length > 0) {
      f = f.filter((b) => {
        const h = Number.parseInt(b.departureTime.split(":")[0]);
        return filters.timeSlots.some((id) => {
          const slot = TIME_SLOTS.find((s) => s.id === id);
          if (!slot) return false;
          const [s, e] = slot.hours;
          return s < e ? h >= s && h < e : h >= s || h < e;
        });
      });
    }
    if (filters.amenities.length > 0) {
      f = f.filter((b) =>
        b.amenities?.length && filters.amenities.every((a) => b.amenities?.includes(a))
      );
    }
    return f;
  }, [initialBuses, filters]);

  const sortedBuses = useMemo(() => {
    const s = [...filteredBuses];
    if (sortBy === "price-asc") return s.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    if (sortBy === "price-desc") return s.sort((a, b) => b.pricePerSeat - a.pricePerSeat);
    return s.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [filteredBuses, sortBy]);

  function handleClearFilters() {
    setFilters({ busType: "all", priceRange: [minPrice, maxPrice], timeSlots: [], amenities: [] });
  }

  function getBookingHref(busId: string) {
    return `/book/${busId}?passengers=${passengers}`;
  }

  return (
    <div className="min-h-screen bg-slate-50/80">

      {/* ── Route banner ── */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900">
                <span>{from}</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                  <ArrowRight className="h-3 w-3 text-slate-600" />
                </div>
                <span>{to}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 ml-1">
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{formatTravelDate(date)}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{passengers} passenger{passengers > 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-semibold text-red-700">
                {sortedBuses.length} departure{sortedBuses.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-2">
          <SearchForm
            compact
            initialValues={{ from, to, date, passengers }}
            title="Refine your journey"
            description="Update your route, date, or passenger count and compare departures."
            tone="light"
          />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="w-full px-4 sm:px-6 lg:px-10 py-5">
        <div className="grid gap-5 lg:grid-cols-[248px_1fr]">

          {/* ── Filter sidebar ── */}
          <div className="shrink-0">
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClear={handleClearFilters}
              resultCount={sortedBuses.length}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>

          {/* ── Results ── */}
          <div className="min-w-0 space-y-4">

            {/* Sort row */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {sortedBuses.length} departure{sortedBuses.length !== 1 ? "s" : ""} · {from} → {to}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatTravelDate(date)} · {passengers} passenger{passengers !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 hidden sm:inline">Sort by:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[170px] h-8 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="departure">Departure Time</SelectItem>
                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bus cards */}
            {sortedBuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <SlidersHorizontal className="h-7 w-7 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No buses match your filters</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-xs">
                  Try adjusting your filters or search for a different date.
                </p>
                <Button
                  onClick={handleClearFilters}
                  className="mt-5 rounded-xl bg-red-600 text-white hover:bg-red-700"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              sortedBuses.map((bus) => (
                <BusCard
                  key={bus.id}
                  bus={bus}
                  bookingHref={getBookingHref(bus.id)}
                  router={router}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Return trip section ── */}
        {returnDate && returnBuses.length > 0 && (
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5">
                <ArrowRight className="h-4 w-4 text-sky-600 rotate-180" />
                <span className="text-sm font-semibold text-sky-700">Return: {to} → {from}</span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="text-sm text-slate-500 -mt-2">
              {formatTravelDate(returnDate)} · {passengers} passenger{passengers !== 1 ? "s" : ""}
            </p>
            {returnBuses.map((bus) => (
              <BusCard
                key={bus.id}
                bus={bus}
                bookingHref={getBookingHref(bus.id)}
                router={router}
                accent="sky"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Individual bus result card ── */
function BusCard({
  bus,
  bookingHref,
  router,
  accent = "red",
}: {
  bus: BusSummary;
  bookingHref: string;
  router: ReturnType<typeof useRouter>;
  accent?: "red" | "sky";
}) {
  const seatsPercent = bus.totalSeats > 0 ? Math.round((bus.seatsLeft / bus.totalSeats) * 100) : 0;
  const isLow = bus.seatsLeft > 0 && bus.seatsLeft <= 5;
  const isFull = bus.seatsLeft === 0;

  const boardingStops = bus.stops.filter((s) => s.boarding).map((s) => s.location);
  const droppingStops = bus.stops.filter((s) => s.dropping).map((s) => s.location);

  const barColor = seatsPercent > 50
    ? "bg-emerald-500"
    : seatsPercent > 20
    ? "bg-amber-400"
    : "bg-red-500";

  const priceColor = accent === "sky" ? "text-sky-600" : "text-red-600";
  const typeBadge = accent === "sky" ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700";
  const lineHover = accent === "sky" ? "group-hover:bg-sky-200" : "group-hover:bg-red-200";
  const durationPill = accent === "sky"
    ? "bg-sky-50 border-sky-200 text-sky-600"
    : "bg-red-50 border-red-200 text-red-600";
  const stripe = accent === "sky"
    ? "from-sky-500 to-blue-600"
    : "from-red-500 to-rose-600";
  const btnClass = accent === "sky"
    ? "from-sky-500 to-blue-600 shadow-sky-200 hover:from-sky-600 hover:to-blue-700"
    : "from-red-500 to-rose-600 shadow-red-200 hover:from-red-600 hover:to-rose-700";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-100 hover:shadow-xl hover:shadow-red-100/40 cursor-pointer"
      onClick={() => router.push(bookingHref)}
    >
      {/* Accent stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${stripe}`} />

      <div className="p-4 sm:p-5">

        {/* ── Row 1: badges + price ── */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${typeBadge}`}>
              {formatBusType(bus.busType)}
            </span>
            {bus.amenities && bus.amenities.length > 0 && bus.amenities.map((a) => (
              <span
                key={a}
                className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {a}
              </span>
            ))}
            {bus.rating && bus.rating.count > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {bus.rating.average}
                <span className="font-normal text-amber-500">({bus.rating.count})</span>
              </span>
            )}
            <DepartureStatusBadge
              status={bus.departureStatus}
              delayMinutes={bus.delayMinutes}
              statusNote={bus.statusNote}
            />
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p className={`text-2xl font-extrabold leading-none ${priceColor}`}>
              {formatCurrency(bus.pricePerSeat)}
            </p>
            <p className="mt-1 text-xs text-slate-400">per seat</p>
          </div>
        </div>

        {/* ── Row 2: journey timeline ── */}
        <div className="mb-4 flex items-center gap-3 sm:gap-5">
          {/* Departure */}
          <div className="min-w-[64px] shrink-0">
            <p className="text-xl font-extrabold text-slate-900 leading-none">{bus.departureTime}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate max-w-[90px]">{bus.from}</p>
          </div>

          {/* Line + duration */}
          <div className="relative flex flex-1 items-center gap-0">
            <div className={`h-[2px] flex-1 bg-slate-200 transition-colors ${lineHover}`} />
            <div className="shrink-0 flex flex-col items-center gap-1 px-3">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap ${durationPill}`}>
                {bus.duration}
              </span>
              <span className="text-[10px] text-slate-400">
                {bus.distance} km · Direct
              </span>
            </div>
            <div className={`h-[2px] flex-1 bg-slate-200 transition-colors ${lineHover}`} />
          </div>

          {/* Arrival */}
          <div className="min-w-[64px] shrink-0 text-right">
            <p className="text-xl font-extrabold text-slate-900 leading-none">{bus.arrivalTime}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate max-w-[90px] ml-auto">{bus.to}</p>
          </div>
        </div>

        {/* ── Row 3: seat bar + CTA ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Seat availability */}
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Seats available</span>
              <span className={`font-bold ${isFull ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-700"}`}>
                {bus.seatsLeft} / {bus.totalSeats}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${Math.max(seatsPercent, isFull ? 0 : 4)}%` }}
              />
            </div>
            {(isLow || isFull) && (
              <p className={`mt-1 text-[11px] font-semibold ${isFull ? "text-red-600" : "text-amber-600"}`}>
                {isFull ? "🔴 Sold out" : `⚡ Only ${bus.seatsLeft} seat${bus.seatsLeft > 1 ? "s" : ""} left!`}
              </p>
            )}
          </div>

          {/* CTA */}
          <Button
            disabled={isFull}
            className={`h-10 shrink-0 rounded-xl px-6 bg-gradient-to-r font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto w-full ${btnClass}`}
            onClick={(e) => {
              e.stopPropagation();
              router.push(bookingHref);
            }}
          >
            {isFull ? "Sold Out" : (
              <>Select Seats <ArrowRight className="ml-1.5 h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* ── Footer: operator + stops ── */}
        {(bus.busDetail || boardingStops.length > 0 || droppingStops.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-100 pt-3">
            {bus.busDetail && (
              <span className="text-xs text-slate-400">
                {bus.busDetail.name} · {bus.busDetail.registrationNumber}
              </span>
            )}
            {boardingStops.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500"
              >
                <MapPin className="h-3 w-3 shrink-0" /> Board at {s}
              </span>
            ))}
            {droppingStops.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500"
              >
                <MapPin className="h-3 w-3 shrink-0" /> Drop at {s}
              </span>
            ))}
            <span className="ml-auto text-xs text-slate-400">{formatTravelDate(bus.travelDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
