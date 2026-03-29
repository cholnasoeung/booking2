"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CalendarDays, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITY_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  initialValues?: {
    from?: string;
    to?: string;
    date?: string;
    passengers?: number;
  };
  compact?: boolean;
  className?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
};

export default function SearchForm({
  initialValues,
  compact = false,
  className,
  title = "Find your next bus",
  description = "Compare departures, fares, and available seats in one place.",
  submitLabel = "Search buses",
}: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(initialValues?.from ?? CITY_OPTIONS[0]);
  const [to, setTo] = useState(initialValues?.to ?? CITY_OPTIONS[1]);
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [passengers, setPassengers] = useState(
    String(initialValues?.passengers ?? 1)
  );
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!from || !to || !date) {
      setError("Please choose your route and travel date.");
      return;
    }

    if (from === to) {
      setError("Departure and destination cities must be different.");
      return;
    }

    setError("");

    const query = new URLSearchParams({
      from,
      to,
      date,
      passengers,
    });

    startTransition(() => {
      router.push(`/search?${query.toString()}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-[28px] border border-white/60 bg-white/88 text-foreground shadow-2xl shadow-red-950/10 backdrop-blur-xl",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-7",
        className
      )}
    >
      <div className={cn("space-y-2", compact ? "mb-4" : "mb-6")}>
        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          compact
            ? "lg:grid-cols-[1fr_auto_1fr_1fr_0.9fr_auto]"
            : "lg:grid-cols-[1fr_auto_1fr_1fr_0.9fr]"
        )}
      >
        <div className="space-y-2">
          <Label htmlFor="from-city">From</Label>
          <Select value={from} onValueChange={(value) => value && setFrom(value)}>
            <SelectTrigger
              id="from-city"
              className="h-12 w-full rounded-2xl border-white/60 bg-white/90 px-4"
            >
              <SelectValue placeholder="Departure city" />
            </SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Swap button in the middle */}
        <div className="flex items-end pb-2">
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 hover:border-indigo-300 hover:scale-110"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <ArrowRightLeft className="size-5" />
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-city">To</Label>
          <Select value={to} onValueChange={(value) => value && setTo(value)}>
            <SelectTrigger
              id="to-city"
              className="h-12 w-full rounded-2xl border-white/60 bg-white/90 px-4"
            >
              <SelectValue placeholder="Destination city" />
            </SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="travel-date">Date</Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="travel-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-12 rounded-2xl border-white/60 bg-white/90 pl-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <div className="relative">
            <Users className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="passengers"
              type="number"
              min={1}
              max={10}
              value={passengers}
              onChange={(event) => setPassengers(event.target.value)}
              className="h-12 rounded-2xl border-white/60 bg-white/90 pl-11"
              required
            />
          </div>
        </div>

        <div className={cn("flex items-end", compact ? "" : "lg:col-span-4")}>
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className={cn(
              "h-12 rounded-2xl px-5 text-sm font-semibold shadow-lg shadow-primary/25",
              compact ? "w-full lg:w-auto" : "w-full"
            )}
          >
            <Search className="size-4" />
            {isPending ? "Searching..." : submitLabel}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
