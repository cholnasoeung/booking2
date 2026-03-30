"use client";

import { BusFront, LayoutDashboard, MapPinned, Ticket, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatTravelDate } from "@/lib/formatters";
import type { AdminBookingSummary, BusSummary, RouteSummary } from "@/lib/queries";
import {
  AvailabilityBadge,
  EmptyState,
  StatusBadge,
  buildRouteUsage,
  emptyRouteUsage,
} from "@/components/admin-management-shared";

type AdminOverviewTabProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  bookings: AdminBookingSummary[];
};

export default function AdminOverviewTab({
  routes,
  buses,
  bookings,
}: AdminOverviewTabProps) {
  const routeUsage = buildRouteUsage(
    routes.map((route) => route.id),
    buses,
    bookings
  );
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled");
  const totalRevenue = confirmedBookings.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0
  );
  const totalSeatsSold = confirmedBookings.reduce(
    (sum, booking) => sum + booking.seats.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          icon={<MapPinned className="size-5" />}
          title="Routes"
          value={String(routes.length)}
          description="Active city pairs"
          gradient="from-emerald-500 to-teal-600"
        />
        <OverviewStatCard
          icon={<BusFront className="size-5" />}
          title="Departures"
          value={String(buses.length)}
          description="Published buses"
          gradient="from-orange-500 to-red-600"
        />
        <OverviewStatCard
          icon={<Ticket className="size-5" />}
          title="Confirmed Bookings"
          value={String(confirmedBookings.length)}
          description={`${cancelledBookings.length} cancelled`}
          gradient="from-pink-500 to-rose-600"
        />
        <OverviewStatCard
          icon={<TrendingUp className="size-5" />}
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          description={`${totalSeatsSold} seats sold`}
          gradient="from-indigo-500 to-purple-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-2 border-indigo-200/60 bg-gradient-to-br from-white to-indigo-50/60 shadow-xl">
          <CardHeader className="border-b border-dashed border-indigo-200/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Ticket className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Recent Bookings</CardTitle>
                <CardDescription>
                  Latest customer activity across the system
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {bookings.length === 0 ? (
              <EmptyState
                icon={<Ticket className="size-10 text-indigo-300" />}
                title="No bookings yet"
                description="Once customers start reserving seats, their activity will appear here."
              />
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {booking.user?.name || "Unknown customer"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.bus
                        ? `${booking.bus.from} to ${booking.bus.to}`
                        : "Bus details unavailable"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusBadge status={booking.status} />
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(booking.totalPrice)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/60 shadow-xl">
            <CardHeader className="border-b border-dashed border-emerald-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                  <LayoutDashboard className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Operations Snapshot</CardTitle>
                  <CardDescription>
                    A quick look at network coverage and route sales
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {routes.length === 0 ? (
                <EmptyState
                  icon={<MapPinned className="size-10 text-emerald-300" />}
                  title="No routes available"
                  description="Create a route to start building your network."
                />
              ) : (
                routes.slice(0, 4).map((route) => {
                  const usage = routeUsage.get(route.id) ?? emptyRouteUsage();

                  return (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {route.from} to {route.to}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {route.duration} • {route.distance} km
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {usage.departures} departures
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/80">
                            Bookings
                          </p>
                          <p className="mt-1 font-semibold text-emerald-900">
                            {usage.confirmedBookings}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/80">
                            Revenue
                          </p>
                          <p className="mt-1 font-semibold text-emerald-900">
                            {formatCurrency(usage.revenue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white to-orange-50/60 shadow-xl">
            <CardHeader className="border-b border-dashed border-orange-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
                  <BusFront className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Upcoming Departures</CardTitle>
                  <CardDescription>
                    Published departures currently in the system
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {buses.length === 0 ? (
                <EmptyState
                  icon={<BusFront className="size-10 text-orange-300" />}
                  title="No departures yet"
                  description="Create a departure to make routes bookable."
                />
              ) : (
                buses.slice(0, 5).map((bus) => (
                  <div
                    key={bus.id}
                    className="rounded-2xl border border-orange-100 bg-white/90 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {bus.from} to {bus.to}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTravelDate(bus.travelDate)} • {bus.departureTime} to{" "}
                          {bus.arrivalTime}
                        </p>
                      </div>
                      <AvailabilityBadge bus={bus} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewStatCard({
  icon,
  title,
  value,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="border-2 border-white/70 bg-white/90 shadow-xl">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-3 font-heading text-3xl font-semibold text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
