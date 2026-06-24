"use client";

import { useState } from "react";
import {
  BusFront,
  LayoutDashboard,
  MapPinned,
  Ticket,
  TrendingUp,
  ArrowRight,
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
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "60d", value: 60 },
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

  const statusDonut = [
    { name: "Confirmed", value: confirmedBookings.length, fill: DONUT_COLORS[0] },
    { name: "Cancelled", value: cancelledBookings.length, fill: DONUT_COLORS[1] },
  ].filter((d) => d.value > 0);

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
    <div className="space-y-5">
      {/* KPI stat cards */}
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
          title="Confirmed"
          value={String(confirmedBookings.length)}
          description={`${cancelledBookings.length} cancelled`}
          gradient="from-indigo-500 to-violet-600"
        />
        <OverviewStatCard
          icon={<TrendingUp className="size-5" />}
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          description={`${totalSeatsSold} seats sold`}
          gradient="from-pink-500 to-rose-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* Line chart */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3 pt-4 px-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Booking Trend</CardTitle>
                  <CardDescription className="text-xs">Bookings & revenue over time</CardDescription>
                </div>
              </div>
              <div className="flex gap-1">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDays(opt.value as 7 | 14 | 30 | 60)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
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
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">No booking data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={28} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 11 }} formatter={(value, name) => name === "revenue" ? [`$${value}`, "Revenue"] : [value, "Bookings"]} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} formatter={(v) => v === "revenue" ? "Revenue ($)" : "Bookings"} />
                  <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={2} dot={{ r: 2.5, fill: "#6366f1" }} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5, fill: "#10b981" }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut charts */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
                  <Ticket className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Booking Status</CardTitle>
                  <CardDescription className="text-xs">Confirmed vs Cancelled</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {statusDonut.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-xs text-slate-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={statusDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" />
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: 11 }} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
                  <MapPinned className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Revenue by Route</CardTitle>
                  <CardDescription className="text-xs">Top 5 routes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {routeDonut.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-xs text-slate-400">No revenue yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={routeDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" />
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: 11 }} formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom row: Bookings + Operations + Departures */}
      <div className="grid gap-5 xl:grid-cols-3">

        {/* Recent Bookings */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
                  <Ticket className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Recent Bookings</CardTitle>
                  <CardDescription className="text-xs">Latest customer activity</CardDescription>
                </div>
              </div>
              <span className="text-xs text-slate-400">{bookings.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<Ticket className="size-8 text-slate-300" />} title="No bookings yet" description="Customer activity will appear here." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bookings.slice(0, 6).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {(booking.user?.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {booking.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {booking.bus ? `${booking.bus.from} → ${booking.bus.to}` : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={booking.status} />
                      <p className="text-xs font-semibold text-slate-700">{formatCurrency(booking.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operations Snapshot */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
                  <LayoutDashboard className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Operations Snapshot</CardTitle>
                  <CardDescription className="text-xs">Route performance</CardDescription>
                </div>
              </div>
              <span className="text-xs text-slate-400">{routes.length} routes</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {routes.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<MapPinned className="size-8 text-slate-300" />} title="No routes yet" description="Create a route to build your network." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {routes.slice(0, 6).map((route) => {
                  const usage = routeUsage.get(route.id) ?? emptyRouteUsage();
                  return (
                    <div key={route.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{route.from} → {route.to}</p>
                        <p className="text-xs text-slate-400">{route.duration} • {route.distance} km</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(usage.revenue)}</p>
                        <p className="text-xs text-slate-400">{usage.confirmedBookings} bookings • {usage.departures} dep.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow">
                  <BusFront className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Upcoming Departures</CardTitle>
                  <CardDescription className="text-xs">Published buses</CardDescription>
                </div>
              </div>
              <span className="text-xs text-slate-400">{buses.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {buses.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<BusFront className="size-8 text-slate-300" />} title="No departures yet" description="Create a departure to start selling tickets." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {buses.slice(0, 6).map((bus) => (
                  <div key={bus.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{bus.from} → {bus.to}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {formatTravelDate(bus.travelDate)} • {bus.departureTime}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <AvailabilityBadge bus={bus} />
                      <p className="text-xs text-slate-400">{bus.seatsLeft} left</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
