"use client";

import { useEffect, useState } from "react";
import { BarChart3, DollarSign, Download, MapPinned, TrendingUp, Users, Globe2 } from "lucide-react";
import AdminVisitorAnalytics from "@/components/admin/admin-visitor-analytics";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPIData {
  totalRevenue: number;
  revenueChange: number;
  totalBookings: number;
  bookingsChange: number;
  averageOccupancy: number;
  totalPassengers: number;
  activeRoutes: number;
  activeBuses: number;
}

interface AnalyticsData {
  kpis: KPIData;
  revenueByRoute: Array<{
    routeId: string;
    routeName: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
  }>;
  dailyRevenue: Array<{
    date: string;    // from metrics.dailyRevenue
    revenue: number;
    bookings: number;
  }>;
  monthlyTrends: Array<{
    month: string;   // from trends
    revenue: number;
    bookings: number;
  }>;
}

const ROUTE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#8b5cf6"];

function toCsvRows(headers: string[], rows: Record<string, any>[]): string {
  const escape = (v: any) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\r\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAnalyticsCsv(data: AnalyticsData | null) {
  if (!data) return;
  const date = new Date().toISOString().slice(0, 10);

  // Sheet 1: KPIs
  const kpiCsv = toCsvRows(
    ["Metric", "Value"],
    [
      { Metric: "Total Revenue", Value: data.kpis.totalRevenue },
      { Metric: "Revenue Change %", Value: data.kpis.revenueChange },
      { Metric: "Total Bookings", Value: data.kpis.totalBookings },
      { Metric: "Bookings Change %", Value: data.kpis.bookingsChange },
      { Metric: "Total Passengers", Value: data.kpis.totalPassengers },
      { Metric: "Average Occupancy %", Value: data.kpis.averageOccupancy },
      { Metric: "Active Routes", Value: data.kpis.activeRoutes },
      { Metric: "Active Buses", Value: data.kpis.activeBuses },
    ]
  );
  downloadCsv(kpiCsv, `analytics-kpis-${date}.csv`);

  // Sheet 2: Daily revenue
  if (data.dailyRevenue.length > 0) {
    const dailyCsv = toCsvRows(["Date", "Revenue", "Bookings"], data.dailyRevenue);
    setTimeout(() => downloadCsv(dailyCsv, `analytics-daily-${date}.csv`), 200);
  }

  // Sheet 3: Revenue by route
  if (data.revenueByRoute.length > 0) {
    const routeCsv = toCsvRows(
      ["Route", "Revenue", "Bookings", "OccupancyRate%"],
      data.revenueByRoute.map((r) => ({
        Route: r.routeName,
        Revenue: r.revenue,
        Bookings: r.bookings,
        "OccupancyRate%": r.occupancyRate?.toFixed(1) ?? "",
      }))
    );
    setTimeout(() => downloadCsv(routeCsv, `analytics-routes-${date}.csv`), 400);
  }
}

export default function AdminAnalyticsTab() {
  const [activeTab, setActiveTab] = useState<"bookings" | "visitors">("bookings");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();
      const previousStartDate = new Date(
        new Date(startDate).getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();

      const params = new URLSearchParams({
        type: "dashboard",
        startDate,
        endDate,
        previousStartDate,
        previousEndDate: startDate,
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      const result = await response.json();

      setData({
        kpis: result.kpis || result,
        revenueByRoute: result.metrics?.revenueByRoute || result.performance || [],
        dailyRevenue: result.metrics?.dailyRevenue || [],
        monthlyTrends: result.trends || [],
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <BarChart3 className="h-12 w-12" />
        <p className="text-sm">Failed to load analytics data</p>
      </div>
    );
  }

  const kpis = data.kpis;
  const hasRouteRevenue = data.revenueByRoute.length > 0;
  const hasDailyRevenue = data.dailyRevenue.length > 0;

  // Format daily revenue dates for display — guard against undefined date
  const dailyChart = data.dailyRevenue
    .filter((d) => d && typeof d.date === "string")
    .map((d) => ({
      ...d,
      date: d.date.length >= 10 ? d.date.slice(5, 10).replace("-", "/") : d.date,
    }));

  // Donut data — fill included so Cell is not needed
  const routeDonut = data.revenueByRoute
    .filter((r) => r.revenue > 0)
    .slice(0, 6)
    .map((r, i) => ({
      name: r.routeName,
      value: r.revenue,
      fill: ROUTE_COLORS[i % ROUTE_COLORS.length],
    }));

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-slate-100 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab("bookings")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
            activeTab === "bookings"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <BarChart3 className="h-4 w-4" />Bookings
        </button>
        <button
          onClick={() => setActiveTab("visitors")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
            activeTab === "visitors"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Globe2 className="h-4 w-4" />Visitors
        </button>
      </div>

      {/* Visitor analytics section */}
      {activeTab === "visitors" && <AdminVisitorAnalytics />}

      {/* Booking analytics section */}
      {activeTab === "bookings" && <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500">Revenue metrics and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={() => exportAnalyticsCsv(data)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-medium text-white shadow transition hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={<DollarSign className="h-5 w-5 text-white" />}
          iconBg="from-emerald-500 to-teal-600"
          label="Total Revenue"
          value={`$${(kpis.totalRevenue || 0).toLocaleString()}`}
          badge={
            kpis.revenueChange !== undefined ? (
              <span className={`text-xs font-semibold ${kpis.revenueChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {kpis.revenueChange >= 0 ? "+" : ""}{kpis.revenueChange}%
              </span>
            ) : null
          }
          border="border-emerald-200"
          bg="from-emerald-50 to-teal-50"
        />
        <KpiTile
          icon={<BarChart3 className="h-5 w-5 text-white" />}
          iconBg="from-indigo-500 to-purple-600"
          label="Total Bookings"
          value={String(kpis.totalBookings || 0)}
          badge={
            kpis.bookingsChange !== undefined ? (
              <span className={`text-xs font-semibold ${kpis.bookingsChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {kpis.bookingsChange >= 0 ? "+" : ""}{kpis.bookingsChange}%
              </span>
            ) : null
          }
          border="border-indigo-200"
          bg="from-indigo-50 to-purple-50"
        />
        <KpiTile
          icon={<Users className="h-5 w-5 text-white" />}
          iconBg="from-pink-500 to-rose-600"
          label="Total Passengers"
          value={String(kpis.totalPassengers || 0)}
          badge={<TrendingUp className="h-4 w-4 text-pink-400" />}
          border="border-pink-200"
          bg="from-pink-50 to-rose-50"
        />
        <KpiTile
          icon={<MapPinned className="h-5 w-5 text-white" />}
          iconBg="from-orange-500 to-amber-500"
          label="Active Routes"
          value={String(kpis.activeRoutes || 0)}
          badge={
            <span className="text-xs font-semibold text-orange-600">
              {kpis.activeBuses || 0} buses
            </span>
          }
          border="border-orange-200"
          bg="from-orange-50 to-amber-50"
        />
      </div>

      {/* Area chart – daily revenue */}
      <Card className="border-2 border-indigo-200/60 bg-gradient-to-br from-white to-indigo-50/40 shadow-xl">
        <CardHeader className="border-b border-dashed border-indigo-200/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Revenue & Bookings Trend</CardTitle>
              <CardDescription>Daily performance over the selected period</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!hasDailyRevenue ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">
              No trend data available for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyChart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={32} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", fontSize: 12, border: "1px solid #e2e8f0" }}
                  formatter={(value, name) => name === "revenue" ? [`$${value}`, "Revenue"] : [value, "Bookings"]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v) => v === "revenue" ? "Revenue ($)" : "Bookings"} />
                <Area yAxisId="left" type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} fill="url(#bookingsGrad)" dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Route breakdown row */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Route revenue table */}
        <Card className="border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 shadow-xl">
          <CardHeader className="border-b border-dashed border-emerald-200/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Revenue by Route</CardTitle>
                <CardDescription>Bookings and occupancy per route</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!hasRouteRevenue ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                No route revenue data for this period
              </div>
            ) : (
              <div className="space-y-3">
                {data.revenueByRoute.map((route, i) => {
                  const pct = route.occupancyRate ?? 0;
                  return (
                    <div key={route.routeId} className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{route.routeName}</p>
                            <p className="text-xs text-slate-500">{route.bookings} bookings</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-indigo-700">${route.revenue.toLocaleString()}</p>
                      </div>
                      {/* Occupancy bar */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%`, background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                        />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-slate-400">{pct.toFixed(0)}% occupancy</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue donut */}
        <Card className="border-2 border-purple-200/60 bg-gradient-to-br from-white to-purple-50/40 shadow-xl">
          <CardHeader className="border-b border-dashed border-purple-200/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Route Revenue Share</CardTitle>
                <CardDescription>Distribution across top routes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center p-4">
            {routeDonut.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                No revenue data
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={routeDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", fontSize: 12 }}
                      formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 w-full space-y-2">
                  {routeDonut.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }} />
                        <span className="text-slate-600 truncate max-w-[120px]">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">${d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </>}
    </div>
  );
}

function KpiTile({
  icon, iconBg, label, value, badge, border, bg,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  badge: React.ReactNode;
  border: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${border} ${bg}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow`}>
          {icon}
        </div>
        {badge}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
    </div>
  );
}
