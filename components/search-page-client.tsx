"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal, ArrowRight, MapPin, Star, Zap,
} from "lucide-react";

import SearchFilters, {
  type FilterState,
  TIME_SLOTS,
} from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/search-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DepartureStatusBadge from "@/components/departure-status-badge";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { BusSummary } from "@/lib/queries";

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
        <div className="w-full px-4 sm:px-6 lg:px-10 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900">
                <span>{from}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
                <span>{to}</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-sm text-slate-500 ml-2">
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{formatTravelDate(date)}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{passengers} passenger{passengers > 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
                {sortedBuses.length} departure{sortedBuses.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact search bar ── */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-3">
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
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8">
        <div className="grid gap-6 lg:grid-cols-[268px_1fr]">

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
          <div className="min-w-0 space-y-5">

            {/* Sort row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {sortedBuses.length} departure{sortedBuses.length !== 1 ? "s" : ""} · {from} → {to}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {formatTravelDate(date)} · {passengers} passenger{passengers !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-slate-500 hidden sm:inline">Sort by:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[180px] h-9 rounded-xl text-sm">
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
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                <SlidersHorizontal className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900">No buses match your filters</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-xs">
                  Try adjusting your filters or search for a different date.
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="mt-5 rounded-xl"
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
          <div className="mt-12 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5">
                <ArrowRight className="h-4 w-4 text-violet-600 rotate-180" />
                <span className="text-sm font-semibold text-violet-700">Return: {to} → {from}</span>
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
                accent="violet"
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
  accent = "indigo",
}: {
  bus: BusSummary;
  bookingHref: string;
  router: ReturnType<typeof useRouter>;
  accent?: "indigo" | "violet";
}) {
  const seatsPercent = bus.totalSeats > 0 ? Math.round((bus.seatsLeft / bus.totalSeats) * 100) : 0;
  const isLow = bus.seatsLeft > 0 && bus.seatsLeft <= 5;
  const isFull = bus.seatsLeft === 0;

  const boardingStops = bus.stops.filter((s) => s.boarding).map((s) => s.location);
  const droppingStops = bus.stops.filter((s) => s.dropping).map((s) => s.location);

  const barColor = seatsPercent > 50
    ? "bg-indigo-500"
    : seatsPercent > 20
    ? "bg-amber-400"
    : "bg-red-500";

  const priceColor = accent === "violet" ? "text-violet-600" : "text-indigo-600";
  const stripe = accent === "violet"
    ? "from-violet-500 to-purple-600"
    : "from-indigo-500 to-violet-600";
  const btnClass = accent === "violet"
    ? "from-violet-500 to-purple-600 shadow-violet-200 hover:from-violet-600 hover:to-purple-700"
    : "from-indigo-500 to-violet-600 shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/40 cursor-pointer"
      onClick={() => router.push(bookingHref)}
    >
      {/* Accent stripe */}
      <div className={`h-1 w-full bg-gradient-to-r ${stripe}`} />

      <div className="p-5 sm:p-6">

        {/* ── Row 1: badges + price ── */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
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
            <p className={`text-3xl font-extrabold leading-none ${priceColor}`}>
              {formatCurrency(bus.pricePerSeat)}
            </p>
            <p className="mt-1 text-xs text-slate-400">per seat</p>
          </div>
        </div>

        {/* ── Row 2: journey timeline ── */}
        <div className="mb-5 flex items-center gap-3 sm:gap-5">
          {/* Departure */}
          <div className="min-w-[72px] shrink-0">
            <p className="text-2xl font-extrabold text-slate-900 leading-none">{bus.departureTime}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate max-w-[90px]">{bus.from}</p>
          </div>

          {/* Line + duration */}
          <div className="relative flex flex-1 items-center gap-0">
            <div className="h-[2px] flex-1 bg-slate-200 group-hover:bg-indigo-200 transition-colors" />
            <div className="shrink-0 flex flex-col items-center gap-1 px-3">
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-bold text-indigo-600 whitespace-nowrap">
                {bus.duration}
              </span>
              <span className="text-[10px] text-slate-400">
                {bus.distance} km · Direct
              </span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-200 group-hover:bg-indigo-200 transition-colors" />
          </div>

          {/* Arrival */}
          <div className="min-w-[72px] shrink-0 text-right">
            <p className="text-2xl font-extrabold text-slate-900 leading-none">{bus.arrivalTime}</p>
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
            className={`h-11 shrink-0 rounded-xl px-7 bg-gradient-to-r font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto w-full ${btnClass}`}
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
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-100 pt-4">
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
