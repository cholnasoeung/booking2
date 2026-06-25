"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Star, AlertTriangle, CheckCircle2, Clock, TrendingDown,
  RefreshCw, Users, DollarSign, ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { toastError } from "@/lib/swal";

type DriverPerf = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string | null;
  status: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  delayedTrips: number;
  onTimePct: number | null;
  avgDelayMins: number;
  totalPassengers: number;
  totalRevenue: number;
  totalIncidents: number;
  highIncidents: number;
  avgRating: number | null;
  ratingCount: number;
};

type SortKey = keyof DriverPerf;

function StarRating({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-300 text-xs">No ratings</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className={cn("h-3.5 w-3.5", value >= 4 ? "text-amber-400 fill-amber-400" : value >= 3 ? "text-amber-300 fill-amber-300" : "text-slate-300 fill-slate-300")} />
      <span className="text-sm font-semibold text-slate-700">{value.toFixed(1)}</span>
    </div>
  );
}

function OnTimeBadge({ pct }: { value?: number | null; pct: number | null }) {
  if (pct == null) return <span className="text-xs text-slate-400">—</span>;
  const color = pct >= 90 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : pct >= 70 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", color)}>
      {pct}%
    </span>
  );
}

export default function AdminDriverPerformanceTab() {
  const today = new Date().toISOString().slice(0, 10);
  const ninetyAgo = new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom]   = useState(ninetyAgo);
  const [to, setTo]       = useState(today);
  const [data, setData]   = useState<DriverPerf[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("completedTrips");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/drivers/performance?from=${from}&to=${to}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.performance ?? []);
    } catch {
      toastError("Failed to load driver performance");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <Minus className="h-3 w-3 opacity-30" /> :
    sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;

  const filtered = data
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search))
    .sort((a, b) => {
      const av = a[sortKey] as number | null ?? -1;
      const bv = b[sortKey] as number | null ?? -1;
      return sortDir === "desc" ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
    });

  // summary stats
  const activeDrivers  = data.filter((d) => d.totalTrips > 0).length;
  const avgOnTime      = data.filter((d) => d.onTimePct != null).reduce((s, d) => s + (d.onTimePct ?? 0), 0) / (data.filter((d) => d.onTimePct != null).length || 1);
  const totalIncidents = data.reduce((s, d) => s + d.totalIncidents, 0);
  const avgRating      = data.filter((d) => d.avgRating != null).reduce((s, d) => s + (d.avgRating ?? 0), 0) / (data.filter((d) => d.avgRating != null).length || 1);

  const COLS: { key: SortKey; label: string }[] = [
    { key: "completedTrips",  label: "Trips"        },
    { key: "onTimePct",       label: "On-Time %"    },
    { key: "totalPassengers", label: "Passengers"   },
    { key: "totalRevenue",    label: "Revenue"      },
    { key: "totalIncidents",  label: "Incidents"    },
    { key: "avgRating",       label: "Avg Rating"   },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Driver Performance</h2>
          <p className="text-sm text-slate-500 mt-1">On-time rate, incidents, passengers, and ratings per driver</p>
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
        <Button onClick={load} disabled={loading} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 text-sm">
          Apply
        </Button>
        <div className="flex-1 min-w-40">
          <Label className="text-xs font-semibold text-slate-600">Search driver</Label>
          <Input placeholder="Name or phone…" className="h-9 rounded-xl text-sm mt-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active Drivers",  value: activeDrivers,                              icon: Users,         color: "bg-indigo-50 border-indigo-100 text-indigo-900"  },
          { label: "Avg On-Time",     value: `${Math.round(avgOnTime * 10) / 10}%`,      icon: CheckCircle2,  color: "bg-emerald-50 border-emerald-100 text-emerald-900" },
          { label: "Total Incidents", value: totalIncidents,                              icon: AlertTriangle, color: "bg-amber-50 border-amber-100 text-amber-900"     },
          { label: "Avg Rating",      value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: Star,          color: "bg-violet-50 border-violet-100 text-violet-900"  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn("rounded-2xl border p-4", color)}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
              <Icon className="h-4 w-4 opacity-50" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 && !loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">No drivers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                  {COLS.map(({ key, label }) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 select-none"
                      onClick={() => toggleSort(key)}>
                      <span className="flex items-center gap-1">{label} <SortIcon k={key} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{driver.name}</p>
                          <p className="text-xs text-slate-400">{driver.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{driver.completedTrips}</p>
                        {driver.cancelledTrips > 0 && (
                          <p className="text-xs text-red-500">{driver.cancelledTrips} cancelled</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <OnTimeBadge pct={driver.onTimePct} />
                      {driver.delayedTrips > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">avg {driver.avgDelayMins}min delay</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{driver.totalPassengers.toLocaleString()}</td>
                    <td className="px-4 py-4 font-semibold text-emerald-700">{formatCurrency(driver.totalRevenue)}</td>
                    <td className="px-4 py-4">
                      {driver.totalIncidents === 0 ? (
                        <span className="text-xs text-slate-400">None</span>
                      ) : (
                        <span className={cn("text-xs font-semibold", driver.highIncidents > 0 ? "text-red-600" : "text-amber-600")}>
                          {driver.totalIncidents}{driver.highIncidents > 0 && ` (${driver.highIncidents} high)`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StarRating value={driver.avgRating} />
                      {driver.ratingCount > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{driver.ratingCount} review{driver.ratingCount !== 1 ? "s" : ""}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
