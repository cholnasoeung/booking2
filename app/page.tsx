import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Sparkles, Ticket } from "lucide-react";

import SearchForm from "@/components/search-form";
import { POPULAR_ROUTES } from "@/lib/constants";
import { getTomorrowDateInput } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";

export default function Home() {
  const tomorrow = getTomorrowDateInput();

  return (
    <div className="pb-20">
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Sparkles className="size-4 text-primary" />
            RedBus-inspired booking flow built for Cambodia routes
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Bus tickets with cleaner search, live seat maps, and faster checkout.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Search routes across Cambodia, compare departure times, and reserve
              seats in a booking flow that feels light, fast, and easy to trust.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-lg shadow-red-950/5">
              <Clock3 className="size-5 text-primary" />
              <p className="mt-4 font-heading text-lg font-semibold">Fast search</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Compare departures and available seats in one clean list.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-lg shadow-red-950/5">
              <Ticket className="size-5 text-primary" />
              <p className="mt-4 font-heading text-lg font-semibold">Seat-first booking</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick exact seats and see the ticket total update instantly.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-lg shadow-red-950/5">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-4 font-heading text-lg font-semibold">Secure account</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Track bookings, cancellations, and admin operations in one place.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-8 top-8 -z-10 h-full rounded-[32px] bg-primary/10 blur-3xl" />
          <SearchForm
            initialValues={{
              from: "Phnom Penh",
              to: "Siem Reap",
              date: tomorrow,
              passengers: 1,
            }}
            title="Search buses across Cambodia"
            description="Choose your route, travel date, and passenger count to see departures that still have room."
          />
        </div>
      </section>

      <section className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-xl shadow-red-950/5 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Popular trips
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">
                Quick routes travellers book the most
              </h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Seeded routes make it easy to explore the booking flow right away.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {POPULAR_ROUTES.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                className="group rounded-[28px] border border-border/70 bg-secondary/70 p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-heading text-2xl font-semibold text-foreground">
                    {route.from}
                  </p>
                  <ArrowRight className="size-5 text-primary transition group-hover:translate-x-1" />
                  <p className="font-heading text-2xl font-semibold text-foreground">
                    {route.to}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-white px-3 py-1 text-muted-foreground">
                    {route.duration}
                  </span>
                  <span className="font-medium text-foreground">
                    from {formatCurrency(route.fare)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
