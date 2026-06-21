"use client";

import { useState, useRef, useTransition } from "react";
import {
  BarChart3, Download, FileSpreadsheet, TrendingUp, TrendingDown,
  Wallet, XCircle, CheckCircle2, Users, MapPin, RefreshCw,
  CalendarRange, FileText, ArrowUpRight, Minus,
} from "lucide-react";

/* ── helpers ── */
function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(n: number) { return `${n.toFixed(1)}%`; }

/* ── types ── */
type DayRevenue = {
  date: string; gross: number; refunds: number; net: number;
  discounts: number; confirmed: number; cancelled: number; total: number;
};
type RouteRow = {
  route: string; confirmed: number; cancelled: number; total: number; revenue: number;
};
type RoutePerf = {
  routeId: string; from: string; to: string;
  totalBookings: number; confirmedBookings: number; cancelledBookings: number;
  revenue: number; refunds: number; totalSeats: number; occupancyNote: string;
};
type ReportData = {
  dateRange: { start: string; end: string };
  revenue: {
    gross: number; refunds: number; discounts: number; net: number;
    byDay: DayRevenue[];
  };
  bookings: {
    total: number; confirmed: number; cancelled: number; pending: number;
    confirmedRate: number; cancellationRate: number;
    avgTicketValue: number; totalPassengers: number;
    byRoute: RouteRow[];
  };
  routes: RoutePerf[];
};

/* ── CSV helpers ── */
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "");
        return v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── small UI pieces ── */
function StatCard({
  icon, label, value, sub, color = "indigo",
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: "indigo" | "violet" | "emerald" | "red" | "amber";
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
    violet: "bg-violet-50 border-violet-100 text-violet-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    red:    "bg-red-50 border-red-100 text-red-600",
    amber:  "bg-amber-50 border-amber-100 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ── mini bar for inline charts ── */
function MiniBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminReportsTab() {
  const today   = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(oneMonthAgo);
  const [endDate,   setEndDate]   = useState(today);
  const [data,      setData]      = useState<ReportData | null>(null);
  const [error,     setError]     = useState("");
  const [isPending, startT]       = useTransition();
  const printRef = useRef<HTMLDivElement>(null);

  /* ── fetch report ── */
  function fetchReport() {
    setError("");
    startT(async () => {
      try {
        const res = await fetch(
          `/api/admin/reports?startDate=${startDate}&endDate=${endDate}`
        );
        if (!res.ok) {
          const d = await res.json();
          setError(d.message ?? "Failed to load report.");
          return;
        }
        setData(await res.json());
      } catch {
        setError("Network error — please try again.");
      }
    });
  }

  /* ── CSV exports ── */
  function exportRevenueCsv() {
    if (!data) return;
    downloadCsv(
      toCsv(data.revenue.byDay.map((d) => ({
        Date: d.date,
        "Gross Revenue ($)": d.gross.toFixed(2),
        "Refunds ($)":       d.refunds.toFixed(2),
        "Discounts ($)":     d.discounts.toFixed(2),
        "Net Revenue ($)":   d.net.toFixed(2),
        "Confirmed Bookings": d.confirmed,
        "Cancelled Bookings": d.cancelled,
        "Total Bookings":     d.total,
      }))),
      `revenue-report-${startDate}-to-${endDate}.csv`
    );
  }

  function exportRoutesCsv() {
    if (!data) return;
    downloadCsv(
      toCsv(data.routes.map((r) => ({
        From:                   r.from,
        To:                     r.to,
        "Total Bookings":       r.totalBookings,
        "Confirmed Bookings":   r.confirmedBookings,
        "Cancelled Bookings":   r.cancelledBookings,
        "Revenue ($)":          r.revenue.toFixed(2),
        "Refunds ($)":          r.refunds.toFixed(2),
        "Seats Sold":           r.totalSeats,
      }))),
      `route-performance-${startDate}-to-${endDate}.csv`
    );
  }

  function exportBookingsCsv() {
    if (!data) return;
    downloadCsv(
      toCsv(data.bookings.byRoute.map((r) => ({
        Route:        r.route,
        "Confirmed":  r.confirmed,
        "Cancelled":  r.cancelled,
        "Total":      r.total,
        "Revenue ($)": r.revenue.toFixed(2),
      }))),
      `bookings-by-route-${startDate}-to-${endDate}.csv`
    );
  }

  /* ── Print PDF ── */
  function handlePrint() {
    window.print();
  }

  /* ── max values for mini bars ── */
  const maxRouteRev  = data ? Math.max(...data.routes.map((r) => r.revenue), 1)          : 1;
  const maxRouteBook = data ? Math.max(...data.routes.map((r) => r.totalBookings), 1)    : 1;
  const maxDayNet    = data ? Math.max(...data.revenue.byDay.map((d) => d.net), 1)       : 1;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Generate revenue, booking, and route performance reports for any date range.
          </p>
        </div>
        {data && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors print:hidden"
          >
            <FileText className="h-4 w-4" /> Print / Save PDF
          </button>
        )}
      </div>

      {/* ── Date range picker + generate ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end print:hidden">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700">Date Range</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:light]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:light]"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5">
            {[
              { label: "7d",  days: 7 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const s = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
                  setStartDate(s);
                  setEndDate(today);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                Last {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchReport}
            disabled={isPending}
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 transition-all"
          >
            {isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
              : <><BarChart3 className="h-4 w-4" /> Generate Report</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!data && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Select a date range and click Generate Report</p>
          <p className="mt-1 text-xs text-slate-400">Revenue, bookings, and route data will appear here.</p>
        </div>
      )}

      {/* ══ REPORT CONTENT ══ */}
      {data && (
        <div ref={printRef} className="space-y-8">

          {/* Report title (shows in print) */}
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Bus Booking System — Report</h1>
            <p className="text-sm text-slate-500 mt-1">
              Period: {data.dateRange.start} to {data.dateRange.end}
            </p>
          </div>

          {/* ── Section 1: Revenue ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                <Wallet className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Revenue Report</h3>
              <span className="ml-auto text-xs text-slate-400">
                {data.dateRange.start} → {data.dateRange.end}
              </span>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Gross Revenue"
                value={fmt(data.revenue.gross)}
                sub="All confirmed bookings"
                color="indigo"
              />
              <StatCard
                icon={<TrendingDown className="h-5 w-5" />}
                label="Total Refunds"
                value={fmt(data.revenue.refunds)}
                sub="From cancellations"
                color="red"
              />
              <StatCard
                icon={<Minus className="h-5 w-5" />}
                label="Discounts Given"
                value={fmt(data.revenue.discounts)}
                sub="Promo code savings"
                color="amber"
              />
              <StatCard
                icon={<ArrowUpRight className="h-5 w-5" />}
                label="Net Revenue"
                value={fmt(data.revenue.net)}
                sub="After refunds"
                color="emerald"
              />
            </div>

            {/* Daily revenue table */}
            {data.revenue.byDay.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">Daily Breakdown</p>
                  <button
                    type="button"
                    onClick={exportRevenueCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors print:hidden"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Date", "Gross", "Refunds", "Discounts", "Net", "Confirmed", "Cancelled", "Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.revenue.byDay.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{fmt(d.gross)}</td>
                          <td className="px-4 py-3 text-red-600">{fmt(d.refunds)}</td>
                          <td className="px-4 py-3 text-amber-600">{fmt(d.discounts)}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(d.net)}</td>
                          <td className="px-4 py-3 text-emerald-600">{d.confirmed}</td>
                          <td className="px-4 py-3 text-red-500">{d.cancelled}</td>
                          <td className="px-4 py-3">
                            <MiniBar value={d.net} max={maxDayNet} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-indigo-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3 text-slate-900">{fmt(data.revenue.gross)}</td>
                        <td className="px-4 py-3 text-red-600">{fmt(data.revenue.refunds)}</td>
                        <td className="px-4 py-3 text-amber-600">{fmt(data.revenue.discounts)}</td>
                        <td className="px-4 py-3 text-indigo-700">{fmt(data.revenue.net)}</td>
                        <td className="px-4 py-3 text-emerald-600">{data.bookings.confirmed}</td>
                        <td className="px-4 py-3 text-red-500">{data.bookings.cancelled}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Bookings ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                <BarChart3 className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Bookings Report</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Total Bookings"
                value={data.bookings.total.toLocaleString()}
                sub={`${data.bookings.pending} pending`}
                color="indigo"
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Confirmed"
                value={`${data.bookings.confirmed.toLocaleString()} (${pct(data.bookings.confirmedRate)})`}
                sub="Successfully booked"
                color="emerald"
              />
              <StatCard
                icon={<XCircle className="h-5 w-5" />}
                label="Cancelled"
                value={`${data.bookings.cancelled.toLocaleString()} (${pct(data.bookings.cancellationRate)})`}
                sub="With refund policy applied"
                color="red"
              />
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Total Passengers"
                value={data.bookings.totalPassengers.toLocaleString()}
                sub={`Avg ticket ${fmt(data.bookings.avgTicketValue)}`}
                color="violet"
              />
            </div>

            {/* Confirmed vs Cancelled visual */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-900">Booking Status Split</p>
              <div className="flex items-center gap-3">
                <div
                  className="h-5 rounded-l-full bg-indigo-500 transition-all"
                  style={{ flex: data.bookings.confirmed }}
                />
                <div
                  className="h-5 rounded-r-full bg-red-400 transition-all"
                  style={{ flex: Math.max(data.bookings.cancelled, 1) }}
                />
              </div>
              <div className="mt-2 flex gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Confirmed {pct(data.bookings.confirmedRate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Cancelled {pct(data.bookings.cancellationRate)}
                </span>
              </div>
            </div>

            {/* Busiest routes table */}
            {data.bookings.byRoute.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">Bookings by Route</p>
                  <button
                    type="button"
                    onClick={exportBookingsCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors print:hidden"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["#", "Route", "Confirmed", "Cancelled", "Total", "Revenue", "Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.bookings.byRoute.map((r, i) => (
                        <tr key={r.route} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-slate-400">#{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{r.route}</td>
                          <td className="px-4 py-3 text-emerald-600">{r.confirmed}</td>
                          <td className="px-4 py-3 text-red-500">{r.cancelled}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{r.total}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(r.revenue)}</td>
                          <td className="px-4 py-3">
                            <MiniBar value={r.total} max={maxRouteBook} color="bg-violet-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 3: Route Performance ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Route Performance</h3>
            </div>

            {data.routes.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No route data for this period.</p>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">
                    {data.routes.length} route{data.routes.length !== 1 ? "s" : ""} active in period
                  </p>
                  <button
                    type="button"
                    onClick={exportRoutesCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors print:hidden"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Route", "Total", "Confirmed", "Cancelled", "Seats Sold", "Revenue", "Refunds", "Rev Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.routes.map((r) => (
                        <tr key={r.routeId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">{r.from}</span>
                            <span className="mx-1.5 text-slate-300">→</span>
                            <span className="font-semibold text-slate-900">{r.to}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{r.totalBookings}</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">{r.confirmedBookings}</td>
                          <td className="px-4 py-3 text-red-500">{r.cancelledBookings}</td>
                          <td className="px-4 py-3 text-slate-700">{r.totalSeats}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(r.revenue)}</td>
                          <td className="px-4 py-3 text-red-500">{fmt(r.refunds)}</td>
                          <td className="px-4 py-3">
                            <MiniBar value={r.revenue} max={maxRouteRev} color="bg-emerald-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-indigo-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3">{data.bookings.total}</td>
                        <td className="px-4 py-3 text-emerald-600">{data.bookings.confirmed}</td>
                        <td className="px-4 py-3 text-red-500">{data.bookings.cancelled}</td>
                        <td className="px-4 py-3">{data.routes.reduce((s, r) => s + r.totalSeats, 0)}</td>
                        <td className="px-4 py-3 text-indigo-700">{fmt(data.revenue.gross)}</td>
                        <td className="px-4 py-3 text-red-500">{fmt(data.revenue.refunds)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Export all ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 print:hidden">
            <Download className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Export all data:</span>
            <button
              type="button"
              onClick={exportRevenueCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Revenue CSV
            </button>
            <button
              type="button"
              onClick={exportBookingsCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Bookings CSV
            </button>
            <button
              type="button"
              onClick={exportRoutesCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Routes CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
