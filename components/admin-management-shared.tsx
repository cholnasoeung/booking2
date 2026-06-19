"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminBookingSummary, BusSummary } from "@/lib/queries";

export const PAGE_SIZE = 10;

type PaginatorProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Paginator({ page, totalPages, totalItems, pageSize, onPageChange }: PaginatorProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{" "}
        <span className="font-semibold text-slate-700">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 rounded-full p-0"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-slate-400">…</span>
          ) : (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={p === page ? "default" : "outline"}
              className={`h-8 w-8 rounded-full p-0 text-xs ${p === page ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 rounded-full p-0"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export type RouteUsage = {
  departures: number;
  bookings: number;
  confirmedBookings: number;
  revenue: number;
};

export function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "orange" | "pink";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-900"
      : "border-pink-200 bg-pink-50 text-pink-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${classes}`}>
      <p className="text-xs uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div>{icon}</div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: AdminBookingSummary["status"];
}) {
  return status === "confirmed" ? (
    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 text-white">
      Confirmed
    </Badge>
  ) : (
    <Badge className="border-gray-300 bg-gray-100 text-gray-700">
      Cancelled
    </Badge>
  );
}

export function AvailabilityBadge({ bus }: { bus: BusSummary }) {
  if (bus.seatsLeft <= 0) {
    return (
      <Badge className="border-red-200 bg-red-100 text-red-700">Sold out</Badge>
    );
  }

  if (bus.seatsLeft <= 5) {
    return (
      <Badge className="border-amber-200 bg-amber-100 text-amber-800">
        Low seats
      </Badge>
    );
  }

  return (
    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
      Open
    </Badge>
  );
}

export function emptyRouteUsage(): RouteUsage {
  return {
    departures: 0,
    bookings: 0,
    confirmedBookings: 0,
    revenue: 0,
  };
}

export function buildRouteUsage(
  routeIds: string[],
  buses: BusSummary[],
  bookings: AdminBookingSummary[]
) {
  const usage = new Map<string, RouteUsage>();

  routeIds.forEach((routeId) => {
    usage.set(routeId, emptyRouteUsage());
  });

  buses.forEach((bus) => {
    const current = usage.get(bus.routeId);
    if (current) {
      current.departures += 1;
    }
  });

  bookings.forEach((booking) => {
    const routeId = booking.bus?.routeId;
    if (!routeId) {
      return;
    }

    const current = usage.get(routeId);
    if (!current) {
      return;
    }

    current.bookings += 1;
    if (booking.status === "confirmed") {
      current.confirmedBookings += 1;
      current.revenue += booking.totalPrice;
    }
  });

  return usage;
}

export function shortBookingId(id: string) {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

export function passengerCountLabel(booking: AdminBookingSummary) {
  const count = booking.passengers.length || booking.seats.length;
  return `${count} passenger${count === 1 ? "" : "s"}`;
}
