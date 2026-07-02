"use client";

import { useMemo, useState } from "react";
import {
  BusFront, CalendarDays, Filter, LayoutDashboard, MapPinned,
  Percent, TrendingUp, Ticket, Users, X, ArrowUpRight,
  ArrowDownRight, Armchair,
} from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import {
  AvailabilityBadge, EmptyState, StatusBadge,
  buildRouteUsage, emptyRouteUsage,
} from "@/components/admin/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatTravelDate } from "@/lib/utils/formatters";
import type { AdminBookingSummary, BusSummary, RouteSummary } from "@/lib/db/queries";

type Props = { routes: RouteSummary[]; buses: BusSummary[]; bookings: AdminBookingSummary[] };

const DONUT_COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#6366f1", "#0ea5e9", "#8b5cf6"];
const TREND_DAYS   = [7, 14, 30, 60] as const;

type TrendDays = (typeof TREND_DAYS)[number];
type DateRange = "today" | "7d" | "30d" | "all";

const DATE_RANGE_OPTS: { label: string; value: DateRange }[] = [
  { label: "Today",    value: "today" },
  { label: "7 days",  value: "7d"    },
  { label: "30 days", value: "30d"   },
  { label: "All time",value: "all"   },
];

function isoToday() { return new Date().toISOString().slice(0, 10); }

function filterByDateRange(bookings: AdminBookingSummary[], range: DateRange) {
  const today = isoToday();
  if (range === "today") return bookings.filter((b) => b.createdAt.slice(0, 10) === today);
  if (range === "7d") {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return bookings.filter((b) => new Date(b.createdAt) >= cutoff);
  }
  if (range === "30d") {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return bookings.filter((b) => new Date(b.createdAt) >= cutoff);
  }
  return bookings;
}

export default function AdminOverviewTab({ routes, buses, bookings }: Props) {
  // ── Filters ──────────────────────────────────────────────────────────
  const [dateRange,   setDateRange]   = useState<DateRange>("7d");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trendDays,   setTrendDays]   = useState<TrendDays>(14);

  // ── Derived filtered data ─────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    let b = filterByDateRange(bookings, dateRange);
    if (routeFilter !== "all") b = b.filter((bk) => bk.bus?.routeId === routeFilter);
    if (statusFilter !== "all") b = b.filter((bk) => bk.status === statusFilter);
    return b;
  }, [bookings, dateRange, routeFilter, statusFilter]);

  const filteredBuses = useMemo(() => {
    if (routeFilter === "all") return buses;
    return buses.filter((b) => b.routeId === routeFilter);
  }, [buses, routeFilter]);

  const confirmedBookings  = filteredBookings.filter((b) => b.status === "confirmed");
  const cancelledBookings  = filteredBookings.filter((b) => b.status === "cancelled");
  const totalRevenue       = confirmedBookings.reduce((s, b) => s + b.totalPrice, 0);
  const totalSeatsSold     = confirmedBookings.reduce((s, b) => s + b.seats.length, 0);
  const totalSeats         = filteredBuses.reduce((s, b) => s + b.totalSeats, 0);
  const bookedSeats        = filteredBuses.reduce((s, b) => s + (b.totalSeats - b.seatsLeft), 0);
  const fillRate           = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
  const avgRevPerBooking   = confirmedBookings.length > 0
    ? totalRevenue / confirmedBookings.length : 0;

  // Compare to previous period for trend arrows
  const prevBookings = useMemo(() => {
    if (dateRange === "all" || dateRange === "today") return bookings;
    const days = dateRange === "7d" ? 7 : 30;
    const to   = new Date(); to.setDate(to.getDate() - days);
    const from = new Date(); from.setDate(from.getDate() - days * 2);
    return bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d >= from && d < to;
    });
  }, [bookings, dateRange]);
  const prevConfirmed = prevBookings.filter((b) => b.status === "confirmed");
  const prevRevenue   = prevConfirmed.reduce((s, b) => s + b.totalPrice, 0);
  const revTrend  = prevRevenue   > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const bkTrend   = prevConfirmed.length > 0
    ? Math.round(((confirmedBookings.length - prevConfirmed.length) / prevConfirmed.length) * 100)
    : null;

  // ── Chart data ────────────────────────────────────────────────────────
  const trendData = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (trendDays - 1 - i));
    const iso = d.toISOString().slice(0, 10);
    const dayBookings = bookings.filter((b) => b.createdAt.slice(0, 10) === iso);
    return {
      date: iso.slice(5).replace("-", "/"),
      bookings: dayBookings.length,
      revenue:  dayBookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.totalPrice, 0),
    };
  });

  const statusDonut = [
    { name: "Confirmed", value: confirmedBookings.length, fill: DONUT_COLORS[0] },
    { name: "Cancelled", value: cancelledBookings.length, fill: DONUT_COLORS[1] },
  ].filter((d) => d.value > 0);

  const routeUsage = buildRouteUsage(routes.map((r) => r.id), buses, bookings);
  const routeDonut = routes
    .map((r, i) => ({
      name: `${r.from}→${r.to}`,
      value: routeUsage.get(r.id)?.revenue ?? 0,
      fill: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const hasFilter = dateRange !== "7d" || routeFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setDateRange("7d");
    setRouteFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-5">

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
          <Filter className="size-3.5" />
          Filters
        </div>

        {/* Date range pills */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 p-0.5">
          {DATE_RANGE_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateRange === opt.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Route filter */}
        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>{r.from} → {r.to}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
          >
            <X className="size-3" />
            Clear
          </button>
        )}

        <div className="ml-auto text-xs text-slate-400">
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} match
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="size-5" />}
          gradient="from-indigo-500 to-violet-600"
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          sub={`${totalSeatsSold} seats sold`}
          trend={revTrend}
        />
        <KpiCard
          icon={<Ticket className="size-5" />}
          gradient="from-pink-500 to-rose-600"
          label="Confirmed"
          value={String(confirmedBookings.length)}
          sub={`${cancelledBookings.length} cancelled`}
          trend={bkTrend}
        />
        <KpiCard
          icon={<Armchair className="size-5" />}
          gradient="from-emerald-500 to-teal-600"
          label="Seat Fill Rate"
          value={`${fillRate}%`}
          sub={`${bookedSeats} / ${totalSeats} seats`}
          trend={null}
        />
        <KpiCard
          icon={<Percent className="size-5" />}
          gradient="from-amber-500 to-orange-600"
          label="Avg. per Booking"
          value={formatCurrency(avgRevPerBooking)}
          sub={`${routes.length} routes · ${filteredBuses.length} deps`}
          trend={null}
        />
      </div>

      {/* ── Route performance bar ──────────────────────────────────────── */}
      {routes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
              <MapPinned className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-slate-900">Route Performance</p>
            <span className="ml-auto text-xs text-slate-400">{routes.length} routes</span>
          </div>
          <div className="space-y-3">
            {routes.map((r) => {
              const u = routeUsage.get(r.id) ?? emptyRouteUsage();
              const maxRev = Math.max(...routes.map((rr) => routeUsage.get(rr.id)?.revenue ?? 0), 1);
              const pct = Math.round((u.revenue / maxRev) * 100);
              return (
                <div key={r.id} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {r.from} → {r.to}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{r.distance} km</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-slate-400">{u.confirmedBookings} bk · {u.departures} dep</span>
                      <span className="text-xs font-bold text-slate-800 w-16 text-right">{formatCurrency(u.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Charts row ─────────────────────────────────────────────────── */}
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
                  <CardTitle className="text-sm">Booking Trend</CardTitle>
                  <CardDescription className="text-xs">Bookings & revenue over time</CardDescription>
                </div>
              </div>
              <div className="flex gap-1 rounded-xl bg-slate-50 border border-slate-100 p-0.5">
                {TREND_DAYS.map((d) => (
                  <button key={d}
                    onClick={() => setTrendDays(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      trendDays === d
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {bookings.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">No booking data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={28} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 11 }}
                    formatter={(value, name) => name === "revenue" ? [`$${value}`, "Revenue"] : [value, "Bookings"]} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} formatter={(v) => v === "revenue" ? "Revenue ($)" : "Bookings"} />
                  <Line yAxisId="left"  type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue"  stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut charts stacked */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
                  <Ticket className="size-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Booking Status</CardTitle>
                  <CardDescription className="text-xs">
                    {statusFilter === "all" ? "Confirmed vs Cancelled" : `Filtered: ${statusFilter}`}
                  </CardDescription>
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

      {/* ── Bottom row ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-3">

        {/* Recent Bookings (filtered) */}
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
              <Badge className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                {filteredBookings.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBookings.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<Ticket className="size-8 text-slate-300" />} title="No bookings" description="Try adjusting the filters." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBookings.slice(0, 6).map((bk) => (
                  <div key={bk.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {(bk.user?.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{bk.user?.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400 truncate">{bk.bus ? `${bk.bus.from} → ${bk.bus.to}` : "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={bk.status} />
                      <p className="text-xs font-semibold text-slate-700">{formatCurrency(bk.totalPrice)}</p>
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
              <Badge className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                {routes.length} routes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {routes.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<MapPinned className="size-8 text-slate-300" />} title="No routes yet" description="Create a route to build your network." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {routes.map((route) => {
                  const u = routeUsage.get(route.id) ?? emptyRouteUsage();
                  if (routeFilter !== "all" && route.id !== routeFilter) return null;
                  return (
                    <div key={route.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{route.from} → {route.to}</p>
                        <p className="text-xs text-slate-400">{route.duration} · {route.distance} km</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(u.revenue)}</p>
                        <p className="text-xs text-slate-400">{u.confirmedBookings} bk · {u.departures} dep</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Departures (filtered) */}
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
              <Badge className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                {filteredBuses.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredBuses.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState icon={<BusFront className="size-8 text-slate-300" />} title="No departures" description="Try adjusting the route filter." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBuses.slice(0, 6).map((bus) => (
                  <div key={bus.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{bus.from} → {bus.to}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {formatTravelDate(bus.travelDate)} · {bus.departureTime}
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

      {/* ── Driver utilisation quick glance ───────────────────────────── */}
      {filteredBuses.length > 0 && (() => {
        const noDriver   = filteredBuses.filter((b) => !b.driver).length;
        const withDriver = filteredBuses.length - noDriver;
        return (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-indigo-500" />
              <p className="text-sm font-bold text-slate-900">Driver Utilisation</p>
              <CalendarDays className="size-3.5 text-slate-400 ml-auto" />
              <span className="text-xs text-slate-400">across {filteredBuses.length} departures</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${filteredBuses.length > 0 ? Math.round((withDriver / filteredBuses.length) * 100) : 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-800 shrink-0">
                {withDriver}/{filteredBuses.length} assigned
              </span>
              {noDriver > 0 && (
                <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]">
                  {noDriver} unassigned
                </Badge>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function KpiCard({
  icon, gradient, label, value, sub, trend,
}: {
  icon: React.ReactNode; gradient: string; label: string;
  value: string; sub: string; trend: number | null;
}) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            {icon}
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5 ${
              trend >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500"
            }`}>
              {trend >= 0
                ? <ArrowUpRight className="size-3" />
                : <ArrowDownRight className="size-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-1">{label}</p>
        <p className="font-heading text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </CardContent>
    </Card>
  );
}
