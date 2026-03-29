import Link from "next/link";
import { ArrowRight, BusFront } from "lucide-react";

import SearchForm from "@/components/search-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTomorrowDateInput, isValidDateInput } from "@/lib/date";
import {
  formatBusType,
  formatCurrency,
  formatTravelDate,
} from "@/lib/formatters";
import { searchBuses } from "@/lib/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/validation";

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawFrom = getFirstSearchParam(params.from);
  const rawTo = getFirstSearchParam(params.to);
  const rawDate = getFirstSearchParam(params.date);
  const rawPassengers = getFirstSearchParam(params.passengers);
  const fallbackDate = getTomorrowDateInput();

  const from = rawFrom ?? "Phnom Penh";
  const to = rawTo ?? "Siem Reap";
  const date = rawDate ?? fallbackDate;
  const passengers = parsePassengerCount(rawPassengers);
  const hasSearch = Boolean(rawFrom || rawTo || rawDate);
  const invalidDate = Boolean(rawDate && !isValidDateInput(rawDate));

  const buses =
    hasSearch && !invalidDate
      ? await searchBuses({
          from: rawFrom,
          to: rawTo,
          date: rawDate,
          passengers,
        })
      : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <SearchForm
        compact
        initialValues={{ from, to, date, passengers }}
        title="Refine your journey"
        description="Update your route, date, or passenger count and compare departures that still have seats available."
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Search results
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          {hasSearch
            ? `${buses.length} departure${buses.length === 1 ? "" : "s"} for ${from} to ${to}`
            : "Choose a route to explore departures"}
        </h1>
        {hasSearch ? (
          <p className="text-sm text-muted-foreground">
            {formatTravelDate(date)} | {passengers} passenger
            {passengers === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {invalidDate ? (
        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardContent className="py-6 text-sm text-red-700">
            Travel date must be in YYYY-MM-DD format.
          </CardContent>
        </Card>
      ) : null}

      {!hasSearch ? (
        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardHeader>
            <CardTitle>Start with a city pair and date</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the search form above to compare buses, fares, layout styles, and
            seats left for your preferred route.
          </CardContent>
        </Card>
      ) : null}

      {hasSearch && !invalidDate && buses.length === 0 ? (
        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardHeader>
            <CardTitle>No buses found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              There are no departures matching that combination right now. Try a
              different travel date or route.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {buses.map((bus) => (
          <article
            key={bus.id}
            className="grid gap-5 rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-xl shadow-red-950/5 sm:grid-cols-[1.3fr_0.8fr_0.7fr]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <BusFront className="size-5" />
                </div>
                <div>
                  <p className="font-heading text-2xl font-semibold text-foreground">
                    {bus.departureTime}
                    <span className="px-3 text-muted-foreground">to</span>
                    {bus.arrivalTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bus.from} to {bus.to}
                  </p>
                </div>
                <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1">{bus.duration}</span>
                <span className="rounded-full bg-secondary px-3 py-1">
                  {bus.distance} km
                </span>
                <span className="rounded-full bg-secondary px-3 py-1">
                  {bus.seatsLeft} seat{bus.seatsLeft === 1 ? "" : "s"} left
                </span>
                <span className="rounded-full bg-secondary px-3 py-1">
                  {bus.templateStatus === "custom" ? "Custom layout" : "Template layout"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Travel date
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {formatTravelDate(bus.travelDate)}
              </p>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 sm:items-end">
              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Fare
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-foreground">
                  {formatCurrency(bus.pricePerSeat)}
                </p>
              </div>
              <Link
                href={`/book/${bus.id}?passengers=${passengers}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
              >
                Book now
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
