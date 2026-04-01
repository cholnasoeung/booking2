"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import SearchFilters, {
  type FilterState,
  TIME_SLOTS,
} from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import SearchForm from "@/components/search-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { BusSummary } from "@/lib/queries";

type SearchPageClientProps = {
  initialBuses: BusSummary[];
  from: string;
  to: string;
  date: string;
  passengers: number;
};

export default function SearchPageClient({
  initialBuses,
  from,
  to,
  date,
  passengers,
}: SearchPageClientProps) {
  const router = useRouter();

  // Calculate price range from available buses
  const prices = initialBuses.map((bus) => bus.pricePerSeat);
  const minPrice = Math.min(...prices, 0);
  const maxPrice = Math.max(...prices, 100);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    busType: "all",
    priceRange: [minPrice, maxPrice],
    timeSlots: [],
    amenities: [],
  });

  // Sort state
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "departure">("departure");

  // Apply filters to buses
  const filteredBuses = useMemo(() => {
    let filtered = [...initialBuses];

    // Bus type filter
    if (filters.busType !== "all") {
      filtered = filtered.filter((bus) => bus.busType === filters.busType);
    }

    // Price range filter
    filtered = filtered.filter(
      (bus) =>
        bus.pricePerSeat >= filters.priceRange[0] &&
        bus.pricePerSeat <= filters.priceRange[1]
    );

    // Time slot filter
    if (filters.timeSlots.length > 0) {
      filtered = filtered.filter((bus) => {
        const hour = Number.parseInt(bus.departureTime.split(":")[0]);
        return filters.timeSlots.some((slotId) => {
          const slot = TIME_SLOTS.find((s) => s.id === slotId);
          if (!slot) return false;
          const [start, end] = slot.hours;
          if (start < end) {
            return hour >= start && hour < end;
          } else {
            return hour >= start || hour < end;
          }
        });
      });
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter((bus) => {
        if (!bus.amenities || bus.amenities.length === 0) return false;
        return filters.amenities.every((amenity) =>
          bus.amenities?.includes(amenity)
        );
      });
    }

    return filtered;
  }, [initialBuses, filters]);

  // Sort buses
  const sortedBuses = useMemo(() => {
    const sorted = [...filteredBuses];
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
      case "price-desc":
        return sorted.sort((a, b) => b.pricePerSeat - a.pricePerSeat);
      case "departure":
        return sorted.sort((a, b) =>
          a.departureTime.localeCompare(b.departureTime)
        );
      default:
        return sorted;
    }
  }, [filteredBuses, sortBy]);

  function handleFiltersChange(newFilters: FilterState) {
    setFilters(newFilters);
  }

  function handleClearFilters() {
    setFilters({
      busType: "all",
      priceRange: [minPrice, maxPrice],
      timeSlots: [],
      amenities: [],
    });
  }

  function getBookingHref(busId: string) {
    const params = new URLSearchParams({
      passengers: String(passengers),
    });

    return `/book/${busId}?${params.toString()}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Search Form */}
      <SearchForm
        compact
        initialValues={{ from, to, date, passengers }}
        title="Refine your journey"
        description="Update your route, date, or passenger count and compare departures."
        tone="light"
      />

      {/* Results Header with Sort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
            Search results
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            {sortedBuses.length} departure{sortedBuses.length === 1 ? "" : "s"} for {from} to {to}
          </h1>
          <p className="text-sm text-slate-600">
            {formatTravelDate(date)} | {passengers} passenger{passengers === 1 ? "" : "s"}
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 hidden sm:inline">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="departure">Departure Time</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Filters Sidebar - Left Side */}
        <div>
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClear={handleClearFilters}
            resultCount={sortedBuses.length}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </div>

        {/* Bus Cards - Right Side */}
        <div className="space-y-4">
          {sortedBuses.length === 0 ? (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <SlidersHorizontal className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No buses match your filters
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Try adjusting your filters or search for different dates
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="rounded-xl"
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedBuses.map((bus) => {
              const bookingHref = getBookingHref(bus.id);
              const boardingStops = bus.stops
                .filter((stop) => stop.boarding)
                .map((stop) => stop.location);
              const droppingStops = bus.stops
                .filter((stop) => stop.dropping)
                .map((stop) => stop.location);

              return (
                <Card
                  key={bus.id}
                  className="border-white/60 bg-white/90 shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(bookingHref)}
                >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-xl">{bus.from} → {bus.to}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        {formatBusType(bus.busType)}
                      </Badge>
                      {bus.amenities && bus.amenities.length > 0 && (
                        <div className="flex gap-1">
                          {bus.amenities.slice(0, 2).map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="outline"
                              className="text-xs border-slate-300 text-slate-600"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {bus.busDetail && (
                      <p className="text-xs text-slate-500">
                        {bus.busDetail.name} · {bus.busDetail.registrationNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(bus.pricePerSeat)}
                    </p>
                    <p className="text-xs text-slate-500">per seat</p>
                  </div>
                </div>
              </CardHeader>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Date</p>
                      <p className="font-medium text-slate-900">{formatTravelDate(bus.travelDate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Departure</p>
                      <p className="font-medium text-slate-900">{bus.departureTime}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Arrival</p>
                      <p className="font-medium text-slate-900">{bus.arrivalTime}</p>
                    </div>
                  </div>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Seats Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">{bus.seatsLeft}</span>
                        <span className="text-xs text-slate-500">/ {bus.totalSeats}</span>
                      </div>
                    </div>

                    {bus.seatsLeft <= 5 && (
                      <div className="rounded-xl bg-amber-50 px-4 py-2 text-center">
                        <p className="text-sm font-medium text-amber-700">
                          ⚡ Fast filling - Only {bus.seatsLeft} seats left!
                        </p>
                      </div>
                    )}

                    <Button
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(bookingHref);
                      }}
                    >
                      Select Seats
                    </Button>
                  </CardContent>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-2 px-4 pb-4">
                    {boardingStops.length > 0 && (
                      <span className="rounded-full border border-slate-200 px-3 py-1">
                        Board at {boardingStops.join(", ")}
                      </span>
                    )}
                    {droppingStops.length > 0 && (
                      <span className="rounded-full border border-slate-200 px-3 py-1">
                        Drop at {droppingStops.join(", ")}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
