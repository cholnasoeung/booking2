"use client";

import { useState } from "react";
import {
  BusFront,
  LayoutDashboard,
  MapPinned,
  Ticket,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AvailabilityBadge,
  EmptyState,
  StatusBadge,
  buildRouteUsage,
  emptyRouteUsage,
} from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatTravelDate } from "@/lib/formatters";
import type { AdminBookingSummary, BusSummary, RouteSummary } from "@/lib/queries";

type AdminOverviewTabProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  bookings: AdminBookingSummary[];
};

const DONUT_COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#6366f1", "#0ea5e9"];

const DATE_RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
] as const;

export default function AdminOverviewTab({ routes, buses, bookings }: AdminOverviewTabProps) {
  const [days, setDays] = useState<7 | 14 | 30 | 60>(14);

  const routeUsage = buildRouteUsage(
    routes.map((r) => r.id),
    buses,
    bookings
  );
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalSeatsSold = confirmedBookings.reduce((sum, b) => sum + b.seats.length, 0);

  // Dynamic trend based on selected date range
  const trendData = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const iso = d.toISOString().slice(0, 10);
    const dayBookings = bookings.filter((b) => b.createdAt.slice(0, 10) === iso);
    return {
      date: iso.slice(5).replace("-", "/"),
      bookings: dayBookings.length,
      revenue: dayBookings
        .filter((b) => b.status === "confirmed")
        .reduce((s, b) => s + b.totalPrice, 0),
    };
  });

  // Donut: booking status — fill in data avoids deprecated <Cell>
  const statusDonut = [
    { name: "Confirmed", value: confirmedBookings.length, fill: DONUT_COLORS[0] },
    { name: "Cancelled", value: cancelledBookings.length, fill: DONUT_COLORS[1] },
  ].filter((d) => d.value > 0);

  // Donut: revenue by route (top 5)
  const routeDonut = routes
    .map((r, i) => ({
      name: `${r.from}→${r.to}`,
      value: routeUsage.get(r.id)?.revenue ?? 0,
      fill: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
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

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Line chart – daily bookings & revenue */}
        <Card className="border-2 border-indigo-200/60 bg-gradient-to-br from-white to-indigo-50/40 shadow-xl">
          <CardHeader className="border-b border-dashed border-indigo-200/60 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Booking Trend</CardTitle>
                  <CardDescription>Bookings and revenue over the selected period</CardDescription>
                </div>
              </div>
              <div className="flex gap-1.5">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDays(opt.value as 7 | 14 | 30 | 60)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      days === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {bookings.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                No booking data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(value, name) =>
                      name === "revenue" ? [`$${value}`, "Revenue"] : [value, "Bookings"]
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(v) => (v === "revenue" ? "Revenue ($)" : "Bookings")}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut charts stacked */}
        <div className="space-y-4">
          {/* Booking status donut */}
          <Card className="border-2 border-pink-200/60 bg-gradient-to-br from-white to-pink-50/40 shadow-xl">
            <CardHeader className="border-b border-dashed border-pink-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow">
                  <Ticket className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Booking Status</CardTitle>
                  <CardDescription className="text-xs">Confirmed vs Cancelled</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {statusDonut.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={statusDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue by route donut */}
          <Card className="border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 shadow-xl">
            <CardHeader className="border-b border-dashed border-emerald-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
                  <MapPinned className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Revenue by Route</CardTitle>
                  <CardDescription className="text-xs">Top 5 routes by revenue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {routeDonut.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">No revenue yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={routeDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", fontSize: 12 }}
                      formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent bookings + Operations snapshot */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-2 border-indigo-200/60 bg-gradient-to-br from-white to-indigo-50/60 shadow-xl">
          <CardHeader className="border-b border-dashed border-indigo-200/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <Ticket className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Recent Bookings</CardTitle>
                <CardDescription>Latest customer activity across the system</CardDescription>
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
                      {booking.bus ? `${booking.bus.from} to ${booking.bus.to}` : "Bus details unavailable"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(booking.createdAt)}</p>
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
                  <CardDescription>A quick look at network coverage and route sales</CardDescription>
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
                    <div key={route.id} className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{route.from} to {route.to}</p>
                          <p className="text-xs text-muted-foreground">{route.duration} • {route.distance} km</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">{usage.departures} departures</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/80">Bookings</p>
                          <p className="mt-1 font-semibold text-emerald-900">{usage.confirmedBookings}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-700/80">Revenue</p>
                          <p className="mt-1 font-semibold text-emerald-900">{formatCurrency(usage.revenue)}</p>
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
                  <CardDescription>Published departures currently in the system</CardDescription>
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
                  <div key={bus.id} className="rounded-2xl border border-orange-100 bg-white/90 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{bus.from} to {bus.to}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTravelDate(bus.travelDate)} • {bus.departureTime} to {bus.arrivalTime}
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
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-3 font-heading text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
