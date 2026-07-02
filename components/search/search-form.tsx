"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CalendarDays, RefreshCw, Search, Users } from "lucide-react";

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
import { CITY_OPTIONS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

type SearchFormProps = {
  initialValues?: {
    from?: string;
    to?: string;
    date?: string;
    returnDate?: string;
    passengers?: number;
  };
  compact?: boolean;
  className?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  tone?: "dark" | "light";
};

export default function SearchForm({
  initialValues,
  compact = false,
  className,
  title = "Find your next bus",
  description = "Compare departures, fares, and available seats in one place.",
  submitLabel = "Search buses",
  tone = "dark",
}: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [from, setFrom] = useState(initialValues?.from ?? CITY_OPTIONS[0]);
  const [to, setTo] = useState(initialValues?.to ?? CITY_OPTIONS[1]);
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [passengers, setPassengers] = useState(
    String(initialValues?.passengers ?? 1)
  );
  const [returnDate, setReturnDate] = useState(initialValues?.returnDate ?? "");
  const [isRoundTrip, setIsRoundTrip] = useState(Boolean(initialValues?.returnDate));
  const [error, setError] = useState("");
  const fieldHeight = compact ? "h-11" : "h-10";
  const formPadding = compact ? "p-4" : "p-4 sm:p-5";
  const isLight = tone === "light";
  const shellClasses = isLight
    ? "border-slate-200/80 bg-white/95 text-slate-900 shadow-xl shadow-slate-200/70"
    : "border-white/20 bg-white/20 text-foreground shadow-lg shadow-slate-950/40";
  const titleClasses = isLight ? "text-slate-900" : "text-white";
  const descriptionClasses = isLight ? "text-slate-600" : "text-white/80";
  const labelClasses = isLight ? "text-slate-500" : "text-white/80";
  const controlClasses = isLight
    ? "border-slate-200 bg-white text-slate-800"
    : "border-white/30 bg-white/70 text-slate-800";

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

    const query = new URLSearchParams({ from, to, date, passengers });
    if (isRoundTrip && returnDate) {
      if (returnDate < date) {
        setError("Return date must be on or after the departure date.");
        return;
      }
      query.set("returnDate", returnDate);
    }

    startTransition(() => {
      router.push(`/search?${query.toString()}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "w-full rounded-[28px] border backdrop-blur-xl",
        shellClasses,
        formPadding,
        className
      )}
    >
      <div className={cn(compact && "lg:grid lg:grid-cols-[240px_1fr] lg:items-end lg:gap-4")}>
        {!compact && (
          <div className="space-y-1 mb-4">
            <p
              className={cn(
                "font-heading font-semibold tracking-tight text-2xl",
                titleClasses
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "max-w-2xl text-sm",
                descriptionClasses
              )}
            >
              {description}
            </p>
          </div>
        )}

        <div
          className={cn(
            compact
              ? "grid grid-cols-[1.4fr_auto_1.4fr_1fr_1fr_auto] items-center gap-3"
              : "grid gap-2 lg:grid-cols-[1fr_auto_1fr_1fr_0.9fr]"
          )}
        >
          <div className="space-y-1">
            {!compact && (
              <Label htmlFor="from-city" className={cn("text-sm font-semibold", labelClasses)}>
                From
              </Label>
            )}
            <Select value={from} onValueChange={(value) => value && setFrom(value)}>
              <SelectTrigger
                id="from-city"
                className={cn(
                  fieldHeight,
                  "w-full rounded-2xl text-sm",
                  compact ? "px-4" : "px-4",
                  controlClasses
                )}
              >
                <SelectValue placeholder={compact ? "From" : "Departure city"} />
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

          {/* Swap button */}
          <div className={cn(compact ? "flex items-center" : "flex items-end")}>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-50 text-indigo-600 transition hover:scale-110 hover:border-indigo-300 hover:bg-indigo-100",
                compact ? "h-9 w-9" : "h-10 w-10"
              )}
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowRightLeft className={cn(compact ? "size-4" : "size-5")} />
            </button>
          </div>

          <div className="space-y-1">
            {!compact && (
              <Label htmlFor="to-city" className={cn("text-sm font-semibold", labelClasses)}>
                To
              </Label>
            )}
            <Select value={to} onValueChange={(value) => value && setTo(value)}>
              <SelectTrigger
                id="to-city"
                className={cn(
                  fieldHeight,
                  "w-full rounded-2xl text-sm",
                  compact ? "px-4" : "px-4",
                  controlClasses
                )}
              >
                <SelectValue placeholder={compact ? "To" : "Destination city"} />
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

          <div className="space-y-1">
            {!compact && (
              <Label htmlFor="travel-date" className={cn("text-sm font-semibold", labelClasses)}>
                Date
              </Label>
            )}
            <div className="relative">
              <CalendarDays className={cn("pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground", compact ? "left-3.5" : "left-4")} />
              <Input
                id="travel-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={cn(
                  fieldHeight,
                  "w-full rounded-2xl text-sm",
                  compact ? "pl-10" : "pl-11",
                  controlClasses
                )}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            {!compact && (
              <Label htmlFor="passengers" className={cn("text-sm font-semibold", labelClasses)}>
                Passengers
              </Label>
            )}
            <div className="relative">
              <Users className={cn("pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground", compact ? "left-3.5" : "left-4")} />
              <Input
                id="passengers"
                type="number"
                min={1}
                max={10}
                value={passengers}
                onChange={(event) => setPassengers(event.target.value)}
                className={cn(
                  fieldHeight,
                  "w-full rounded-2xl text-sm",
                  compact ? "pl-10" : "pl-11",
                  controlClasses
                )}
                placeholder={compact ? "Guests" : ""}
                required
              />
            </div>
          </div>

          {/* Round-trip toggle + return date */}
          {!compact && (
            <div className="space-y-1 lg:col-span-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsRoundTrip(!isRoundTrip); if (isRoundTrip) setReturnDate(""); }}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    isRoundTrip
                      ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                      : "border-slate-200 bg-white/60 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                  )}
                >
                  <RefreshCw className="size-3" />
                  Round Trip
                </button>
              </div>
              {isRoundTrip && (
                <div className="relative max-w-xs">
                  <Label htmlFor="return-date" className={cn("text-sm font-semibold mb-1 block", labelClasses)}>
                    Return Date
                  </Label>
                  <CalendarDays className="pointer-events-none absolute bottom-[11px] left-4 size-4 text-muted-foreground" />
                  <Input
                    id="return-date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={date}
                    className={cn(fieldHeight, "w-full rounded-2xl pl-11 text-sm", controlClasses)}
                    required={isRoundTrip}
                  />
                </div>
              )}
            </div>
          )}

          <div className={cn("flex items-end", compact ? "" : "lg:col-span-4")}>
            <Button
              type="submit"
              disabled={isPending}
              className={cn(
                fieldHeight,
                "rounded-2xl bg-amber-400 px-5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-400/30",
                compact ? "w-full" : "w-full"
              )}
            >
              <Search className="size-4" />
              {isPending ? "Searching..." : submitLabel}
            </Button>
          </div>
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
