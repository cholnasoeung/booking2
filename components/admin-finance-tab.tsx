"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Ticket, RefreshCw,
  BarChart3, ArrowUpRight, ArrowDownRight, CreditCard, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { toastError } from "@/lib/swal";

/* ── types ──────────────────────────────────────────────────────── */
type TimelinePoint = {
  label: string;
  revenue: number;
  refunds: number;
  net: number;
  bookings: number;
  seats: number;
};

type RouteRow = {
  routeId: string | null;
  from: string;
  to: string;
  revenue: number;
  refunds: number;
  net: number;
  bookings: number;
  seats: number;
  avgPrice: number;
};

type PaymentRow = { method: string; revenue: number; bookings: number };

type Summary = {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalBookings: number;
  totalSeats: number;
  avgTicketPrice: number;
  cancelledCount: number;
  cancellationRate: number;
  revenueChange: number | null;
};

type FinanceData = {
  period: { from: string; to: string; groupBy: string };
  summary: Summary;
  timeline: TimelinePoint[];
  routeBreakdown: RouteRow[];
  paymentBreakdown: PaymentRow[];
};

/* ── mini bar chart ─────────────────────────────────────────────── */
function MiniBarChart({ data }: { data: TimelinePoint[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data</div>;
  const maxVal = Math.max(...data.map((d) => d.net), 1);
  return (
    <div className="flex items-end gap-1 h-40 w-full">
      {data.map((point, i) => {
        const h = Math.max((point.net / maxVal) * 100, point.net > 0 ? 4 : 0);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm bg-indigo-500 hover:bg-indigo-400 transition-colors cursor-default"
              style={{ height: `${h}%` }}
            />
            {/* tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex flex-col items-center">
              <div className="bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                <p className="font-semibold">{point.label}</p>
                <p>Net {formatCurrency(point.net)}</p>
                <p className="text-slate-400">{point.bookings} bookings</p>
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI card ────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, color, change,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; change?: number | null;
}) {
  return (
    <div className={cn("rounded-2xl border p-5 space-y-3", color)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <Icon className="h-4 w-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <div className="flex items-center justify-between">
        {sub && <p className="text-xs opacity-60">{sub}</p>}
        {change != null && (
          <span className={cn("flex items-center gap-0.5 text-xs font-semibold", change >= 0 ? "text-emerald-600" : "text-red-600")}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change)}% vs prev period
          </span>
        )}
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────── */
export default function AdminFinanceTab() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom]       = useState(thirtyAgo);
  const [to, setTo]           = useState(today);
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData]       = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, groupBy });
      const res = await fetch(`/api/admin/finance?${params}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toastError("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Revenue &amp; Finance</h2>
          <p className="text-sm text-slate-500 mt-1">Income, refunds, and route profitability</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors self-start sm:self-auto">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">From</Label>
          <Input type="date" className="h-9 rounded-xl text-sm w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">To</Label>
          <Input type="date" className="h-9 rounded-xl text-sm w-36" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Group by</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v ?? "day")}>
            <SelectTrigger className="h-9 w-28 rounded-xl text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={loading} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-sm">
          Apply
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Net Revenue" value={formatCurrency(s?.netRevenue ?? 0)}
          sub={`${formatCurrency(s?.totalRefunds ?? 0)} refunded`}
          icon={DollarSign} color="bg-indigo-50 border-indigo-100 text-indigo-900"
          change={s?.revenueChange ?? null} />
        <KpiCard label="Total Bookings" value={String(s?.totalBookings ?? 0)}
          sub={`${s?.cancelledCount ?? 0} cancelled (${s?.cancellationRate ?? 0}%)`}
          icon={Ticket} color="bg-emerald-50 border-emerald-100 text-emerald-900" />
        <KpiCard label="Avg Ticket Price" value={formatCurrency(s?.avgTicketPrice ?? 0)}
          sub={`${s?.totalSeats ?? 0} seats sold`}
          icon={TrendingUp} color="bg-amber-50 border-amber-100 text-amber-900" />
        <KpiCard label="Gross Revenue" value={formatCurrency(s?.totalRevenue ?? 0)}
          sub="before refunds"
          icon={BarChart3} color="bg-violet-50 border-violet-100 text-violet-900" />
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-slate-900">Net Revenue Over Time</p>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {data ? <MiniBarChart data={data.timeline} /> : (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
        )}
        {/* x-axis labels (show every ~5th) */}
        {data && data.timeline.length > 0 && (
          <div className="flex mt-1">
            {data.timeline.map((p, i) => (
              <div key={i} className="flex-1 text-center">
                {(i === 0 || i === data.timeline.length - 1 || i % Math.ceil(data.timeline.length / 6) === 0) && (
                  <span className="text-[9px] text-slate-400">{p.label.slice(5)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Route className="h-4 w-4 text-slate-500" />
          <p className="font-semibold text-slate-900">Revenue by Route</p>
        </div>
        {!data || data.routeBreakdown.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No route data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Route", "Bookings", "Seats Sold", "Gross", "Refunds", "Net", "Avg Ticket"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.routeBreakdown.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 whitespace-nowrap">{r.from} → {r.to}</td>
                    <td className="px-5 py-3 text-slate-700">{r.bookings}</td>
                    <td className="px-5 py-3 text-slate-700">{r.seats}</td>
                    <td className="px-5 py-3 text-slate-700">{formatCurrency(r.revenue)}</td>
                    <td className="px-5 py-3 text-red-600">{r.refunds > 0 ? `−${formatCurrency(r.refunds)}` : "—"}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-700">{formatCurrency(r.net)}</td>
                    <td className="px-5 py-3 text-slate-600">{formatCurrency(r.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment method breakdown */}
      {data && data.paymentBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <p className="font-semibold text-slate-900">Payment Methods</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.paymentBreakdown.map((p, i) => {
              const pct = s?.totalRevenue ? Math.round((p.revenue / s.totalRevenue) * 100) : 0;
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-4">
                  <p className="w-28 font-medium text-slate-800 capitalize">{p.method}</p>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="w-16 text-right text-sm font-semibold text-slate-700">{pct}%</p>
                  <p className="w-24 text-right text-sm text-slate-600">{formatCurrency(p.revenue)}</p>
                  <p className="w-20 text-right text-xs text-slate-400">{p.bookings} bookings</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
