"use client";

import { useEffect, useState } from "react";
import {
  Monitor, Smartphone, Tablet, Globe2, RefreshCw,
  TrendingUp, Eye, Users, FileText, ExternalLink,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

type VisitorData = {
  period: string;
  summary: { totalViews: number; uniqueSessions: number; todayViews: number };
  devices:   { name: string; count: number }[];
  browsers:  { name: string; count: number }[];
  os:        { name: string; count: number }[];
  topPages:  { page: string; count: number }[];
  referrers: { source: string; count: number }[];
  hourly:    { hour: string; count: number }[];
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#6366f1",
  mobile:  "#f43f5e",
  tablet:  "#f59e0b",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile:  <Smartphone className="h-4 w-4" />,
  tablet:  <Tablet className="h-4 w-4" />,
};

const PALETTE = ["#6366f1","#10b981","#f59e0b","#f43f5e","#0ea5e9","#8b5cf6","#ec4899","#14b8a6"];

function BarList({ items, total }: { items: { name: string; count: number }[]; total: number }) {
  return (
    <div className="space-y-2.5">
      {items.slice(0, 7).map((item, i) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.name} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-xs font-medium text-slate-600 truncate">{item.name || "Unknown"}</div>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              />
            </div>
            <div className="w-16 shrink-0 text-right">
              <span className="text-xs font-bold text-slate-700">{item.count}</span>
              <span className="text-[10px] text-slate-400 ml-1">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  icon, label, value, sub, color,
}: { icon: React.ReactNode; label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 bg-gradient-to-br ${color}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 shadow-sm">
          {icon}
        </div>
        {sub && <span className="ml-auto text-xs font-semibold text-slate-500">{sub}</span>}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-600 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminVisitorAnalytics() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/visitors?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading visitor data…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Globe2 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Failed to load visitor analytics</p>
      </div>
    );
  }

  const { summary, devices, browsers, os, topPages, referrers, hourly } = data;
  const totalDevices = devices.reduce((s, d) => s + d.count, 0);
  const totalBrowsers = browsers.reduce((s, d) => s + d.count, 0);
  const totalOS = os.reduce((s, d) => s + d.count, 0);
  const devicePie = devices.map((d) => ({ ...d, fill: DEVICE_COLORS[d.name] ?? "#94a3b8" }));

  const hasHourly = hourly.some((h) => h.count > 0);

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Visitor Analytics</h3>
          <p className="text-sm text-slate-500 mt-0.5">Track who visits your site, on what device, and from where</p>
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
          {(["today", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                period === p ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {p === "today" ? "Today" : p === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Eye className="h-4 w-4 text-indigo-600" />}
          label="Total Page Views"
          value={summary.totalViews}
          color="from-indigo-50 to-violet-50 border-indigo-200"
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          label="Unique Sessions"
          value={summary.uniqueSessions}
          color="from-emerald-50 to-teal-50 border-emerald-200"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-rose-600" />}
          label="Views Today"
          value={summary.todayViews}
          color="from-rose-50 to-pink-50 border-rose-200"
        />
      </div>

      {/* Devices + Browsers + OS */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Devices donut */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-indigo-500" />Devices
          </h4>
          {totalDevices === 0 ? (
            <div className="flex h-32 items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={devicePie} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                    paddingAngle={3} dataKey="count">
                    {devicePie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "10px", fontSize: 12 }}
                    formatter={(v, n) => [v, String(n).charAt(0).toUpperCase() + String(n).slice(1)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {devices.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DEVICE_COLORS[d.name] ?? "#94a3b8" }} />
                      <span className="capitalize text-slate-600 flex items-center gap-1">
                        {DEVICE_ICONS[d.name]}{d.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-800">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Browsers */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-emerald-500" />Browsers
          </h4>
          {totalBrowsers === 0 ? (
            <div className="flex h-32 items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <BarList items={browsers} total={totalBrowsers} />
          )}
        </div>

        {/* Operating Systems */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-violet-500" />Operating Systems
          </h4>
          {totalOS === 0 ? (
            <div className="flex h-32 items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <BarList items={os} total={totalOS} />
          )}
        </div>
      </div>

      {/* Hourly traffic chart (today) */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Today&apos;s Traffic by Hour
        </h4>
        {!hasHourly ? (
          <div className="flex h-32 items-center justify-center text-slate-400 text-sm">
            No visits recorded today yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourly} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "10px", fontSize: 12 }}
                formatter={(v) => [v, "Views"]}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Pages + Referrers */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top Pages */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" />Top Pages
          </h4>
          {topPages.length === 0 ? (
            <p className="text-slate-400 text-sm">No page data yet</p>
          ) : (
            <div className="space-y-1">
              {topPages.slice(0, 8).map((p, i) => (
                <div key={p.page} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-[11px] font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 font-medium truncate"
                    title={p.page}>{p.page || "/"}</span>
                  <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-emerald-500" />Traffic Sources
          </h4>
          {referrers.length === 0 ? (
            <p className="text-slate-400 text-sm">No referrer data yet</p>
          ) : (
            <div className="space-y-1">
              {referrers.slice(0, 8).map((r, i) => (
                <div key={r.source} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-[11px] font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 font-medium">
                      {r.source === "direct" ? "Direct / None" : r.source}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
