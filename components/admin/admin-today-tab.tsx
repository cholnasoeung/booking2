"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  ArrowRight,
  BusFront,
  Clock,
  DollarSign,
  RefreshCw,
  Ticket,
  UserPlus,
  Users,
  XCircle,
  CheckCircle2,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
interface TodayStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  revenue: number;
  totalPassengers: number;
  newUsers: number;
  totalDepartures: number;
}

interface BookingEntry {
  id: string;
  status: "confirmed" | "cancelled" | string;
  createdAt: string;
  totalPrice: number;
  seats: string[];
  passengerCount: number;
  user: { id: string; name: string; email: string } | null;
  route: { from: string; to: string } | null;
  departureTime: string | null;
  busNumber: string | null;
}

interface DepartureEntry {
  id: string;
  busNumber: string | null;
  departureTime: string;
  arrivalTime: string | null;
  totalSeats: number;
  bookedCount: number;
  departureStatus: string;
  delayMinutes: number;
  driver: { name: string; phone: string } | null;
  route: { from: string; to: string } | null;
}

interface HourlyEntry {
  hour: number;
  label: string;
  count: number;
  revenue: number;
}

interface TodayData {
  todayDate: string;
  generatedAt: string;
  stats: TodayStats;
  bookings: BookingEntry[];
  departures: DepartureEntry[];
  hourlyBookings: HourlyEntry[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatKHR(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function formatTime(isoOrTime: string | null | undefined) {
  if (!isoOrTime) return "—";
  const d = new Date(isoOrTime);
  if (isNaN(d.getTime())) return isoOrTime;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fillPct(booked: number, total: number) {
  if (!total) return 0;
  return Math.round((booked / total) * 100);
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  departed: "bg-emerald-100 text-emerald-700",
  arrived: "bg-gray-100 text-gray-600",
  delayed: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── sub-components ───────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BookingCard({ b }: { b: BookingEntry }) {
  const isConfirmed = b.status === "confirmed";
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
        isConfirmed
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-red-200 bg-red-50/40"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isConfirmed ? "bg-emerald-600 text-white" : "bg-red-400 text-white"
        }`}
      >
        {b.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {b.user?.name ?? "Guest"}
          </span>
          <span className="text-xs text-gray-400 truncate">{b.user?.email}</span>
        </div>

        {b.route && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
            <span>{b.route.from}</span>
            <ArrowRight className="w-3 h-3 shrink-0 text-gray-400" />
            <span>{b.route.to}</span>
            {b.departureTime && (
              <>
                <span className="text-gray-400">·</span>
                <span>{formatTime(b.departureTime)}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{formatKHR(b.totalPrice)}</span>
          <span>{b.passengerCount} seat{b.passengerCount !== 1 ? "s" : ""}</span>
          {b.seats.length > 0 && (
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
              {b.seats.slice(0, 3).join(", ")}
              {b.seats.length > 3 ? ` +${b.seats.length - 3}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isConfirmed ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {b.status}
        </span>
        <span className="text-[10px] text-gray-400">{timeAgo(b.createdAt)}</span>
      </div>
    </div>
  );
}

function DepartureRow({ d }: { d: DepartureEntry }) {
  const pct = fillPct(d.bookedCount, d.totalSeats);
  const statusClass =
    STATUS_COLORS[d.departureStatus] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        <BusFront className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {d.route ? (
            <span className="text-sm font-semibold text-gray-900">
              {d.route.from}{" "}
              <ArrowRight className="inline w-3 h-3 text-gray-400" />{" "}
              {d.route.to}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">Unknown route</span>
          )}
          {d.busNumber && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
              {d.busNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-500">
            <Clock className="inline w-3 h-3 mr-0.5" />
            {formatTime(d.departureTime)}
            {d.delayMinutes > 0 && (
              <span className="ml-1 text-amber-600 font-medium">
                +{d.delayMinutes}m delay
              </span>
            )}
          </span>
          {d.driver && (
            <span className="text-xs text-gray-400">{d.driver.name}</span>
          )}
        </div>

        {/* Seat fill bar */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 90
                  ? "bg-red-500"
                  : pct >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {d.bookedCount}/{d.totalSeats} ({pct}%)
          </span>
        </div>
      </div>

      <span
        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${statusClass}`}
      >
        {d.departureStatus}
      </span>
    </div>
  );
}

// ─── custom tooltip for hourly chart ─────────────────────────────────────────
function HourlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-indigo-600">Bookings: {payload[0]?.value ?? 0}</p>
      <p className="text-emerald-600">Revenue: {formatKHR(payload[1]?.value ?? 0)}</p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminTodayTab() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [bookingFilter, setBookingFilter] = useState<"all" | "confirmed" | "cancelled">("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/today");
      if (!res.ok) throw new Error("Failed to load");
      const json: TodayData = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const filteredBookings =
    data?.bookings.filter((b) =>
      bookingFilter === "all" ? true : b.status === bookingFilter
    ) ?? [];

  // Only show hours that have activity or are in the current day window
  const currentHour = new Date().getUTCHours();
  const hourlyChartData = (data?.hourlyBookings ?? []).filter(
    (h) => h.hour <= currentHour
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Today's Activity</h2>
          <p className="text-sm text-gray-500">
            {data?.todayDate ?? "—"} · Live overview of bookings and departures
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">
              Updated {timeAgo(lastRefreshed.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            icon={Ticket}
            label="Total Bookings"
            value={data.stats.totalBookings}
            sub={`${data.stats.confirmedBookings} confirmed`}
            color="bg-indigo-100 text-indigo-600"
          />
          <KpiCard
            icon={DollarSign}
            label="Revenue"
            value={formatKHR(data.stats.revenue)}
            sub="confirmed only"
            color="bg-emerald-100 text-emerald-600"
          />
          <KpiCard
            icon={Users}
            label="Passengers"
            value={data.stats.totalPassengers}
            sub="seats booked"
            color="bg-sky-100 text-sky-600"
          />
          <KpiCard
            icon={XCircle}
            label="Cancelled"
            value={data.stats.cancelledBookings}
            sub="today"
            color="bg-red-100 text-red-600"
          />
          <KpiCard
            icon={BusFront}
            label="Departures"
            value={data.stats.totalDepartures}
            sub="today"
            color="bg-orange-100 text-orange-600"
          />
          <KpiCard
            icon={UserPlus}
            label="New Users"
            value={data.stats.newUsers}
            sub="joined today"
            color="bg-violet-100 text-violet-600"
          />
        </div>
      )}

      {/* Hourly Booking Chart */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900">Bookings by Hour (Today)</h3>
          </div>
          {hourlyChartData.some((h) => h.count > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={hourlyChartData}
                margin={{ top: 4, right: 0, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<HourlyTooltip />} cursor={{ fill: "#f3f4f6" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} hide />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              No bookings recorded yet today
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Booking Feed */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Feed header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900">Today's Bookings</h3>
            <div className="flex gap-1">
              {(["all", "confirmed", "cancelled"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setBookingFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    bookingFilter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Feed list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-4 space-y-2 max-h-[480px]">
            {loading && !data && (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading…
              </div>
            )}
            {!loading && filteredBookings.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400">
                <Ticket className="w-8 h-8 mb-2 opacity-30" />
                No {bookingFilter !== "all" ? bookingFilter : ""} bookings today
              </div>
            )}
            {filteredBookings.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </div>
        </div>

        {/* Today's Departures */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Today's Departures</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.stats.totalDepartures ?? 0} bus{(data?.stats.totalDepartures ?? 0) !== 1 ? "es" : ""} departing
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 max-h-[480px]">
            {loading && !data && (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading…
              </div>
            )}
            {!loading && (data?.departures ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400">
                <BusFront className="w-8 h-8 mb-2 opacity-30" />
                No departures today
              </div>
            )}
            {(data?.departures ?? []).map((d) => (
              <DepartureRow key={d.id} d={d} />
            ))}
          </div>
        </div>
      </div>

      {/* Auto-refresh note */}
      <p className="text-center text-xs text-gray-400">
        Auto-refreshes every 30 seconds · All times UTC
      </p>
    </div>
  );
}
