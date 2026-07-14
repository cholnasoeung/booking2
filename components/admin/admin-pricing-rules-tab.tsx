"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Tag, Plus, RefreshCw, Pencil, Trash2, TrendingUp,
  TrendingDown, Calendar, Zap, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmDelete } from "@/lib/utils/swal";

type RuleType  = "seasonal" | "holiday" | "weekend" | "event" | "early_bird" | "last_minute";
type RuleScope = "all" | "route" | "bus_type";

type PricingRule = {
  id: string; name: string; type: RuleType; scope: RuleScope;
  routeId: string | null; routeLabel: string | null;
  busType: string | null; startDate: string; endDate: string;
  multiplier: number; isActive: boolean; priority: number;
  description: string | null; createdAt: string;
};

type RouteOption = { id: string; label: string };

const TYPE_CFG: Record<RuleType, { label: string; color: string; bg: string }> = {
  seasonal:    { label: "Seasonal",    color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  holiday:     { label: "Holiday",     color: "text-red-700",    bg: "bg-red-100 border-red-300"       },
  weekend:     { label: "Weekend",     color: "text-purple-700", bg: "bg-purple-100 border-purple-300" },
  event:       { label: "Event",       color: "text-blue-700",   bg: "bg-blue-100 border-blue-300"     },
  early_bird:  { label: "Early Bird",  color: "text-teal-700",   bg: "bg-teal-100 border-teal-300"     },
  last_minute: { label: "Last Minute", color: "text-amber-700",  bg: "bg-amber-100 border-amber-300"   },
};

const BUS_TYPES = ["bus_45", "mini_bus", "sleeper_30", "sleeper_40", "car"];

const EMPTY: { name: string; type: RuleType; scope: RuleScope; startDate: string; endDate: string; multiplier: string; priority: string; description: string; busType: string; routeId: string } = {
  name: "", type: "seasonal", scope: "all", routeId: "", busType: "",
  startDate: "", endDate: "", multiplier: "1.2", priority: "1", description: "",
};

function MultiplierBadge({ m }: { m: number }) {
  const pct  = Math.round((m - 1) * 100);
  const up   = pct >= 0;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
      up ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isActive(r: PricingRule) {
  const now = Date.now();
  return r.isActive && new Date(r.startDate).getTime() <= now && new Date(r.endDate).getTime() >= now;
}

export default function AdminPricingRulesTab() {
  const [rules, setRules]             = useState<PricingRule[]>([]);
  const [routes, setRoutes]           = useState<RouteOption[]>([]);
  const [activeTodayCount, setActiveTodayCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [filterActive, setFilterActive] = useState("");
  const [, startTransition]           = useTransition();

  const [dlgOpen, setDlgOpen]   = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const q = filterActive ? `?active=${filterActive}` : "";
    const res = await window.fetch(`/api/admin/pricing-rules${q}`);
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules);
      setRoutes(data.routes);
      setActiveTodayCount(data.activeTodayCount);
    }
    setLoading(false);
  }, [filterActive]);

  useEffect(() => { startTransition(() => { fetchRules(); }); }, [fetchRules]);

  function openAdd() {
    setEditRule(null);
    setForm({ ...EMPTY });
    setError(""); setDlgOpen(true);
  }

  function openEdit(r: PricingRule) {
    setEditRule(r);
    setForm({
      name: r.name, type: r.type, scope: r.scope,
      routeId: r.routeId ?? "", busType: r.busType ?? "",
      startDate: r.startDate.slice(0, 10), endDate: r.endDate.slice(0, 10),
      multiplier: String(r.multiplier), priority: String(r.priority),
      description: r.description ?? "",
    });
    setError(""); setDlgOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required."); return; }
    const mult = Number(form.multiplier);
    if (isNaN(mult) || mult < 0.1) { setError("Multiplier must be ≥ 0.1"); return; }

    setSaving(true); setError("");
    try {
      const payload = {
        name: form.name.trim(), type: form.type, scope: form.scope,
        routeId:     form.scope === "route"    ? form.routeId    : undefined,
        busType:     form.scope === "bus_type" ? form.busType    : undefined,
        startDate:   form.startDate, endDate: form.endDate,
        multiplier:  mult, priority: Number(form.priority),
        description: form.description.trim() || undefined,
      };
      const res = editRule
        ? await window.fetch(`/api/admin/pricing-rules/${editRule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await window.fetch("/api/admin/pricing-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Failed."); return; }
      setDlgOpen(false); fetchRules();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function toggleActive(r: PricingRule) {
    await window.fetch(`/api/admin/pricing-rules/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    fetchRules();
  }

  async function handleDelete(r: PricingRule) {
    const ok = await confirmDelete(`Delete pricing rule "${r.name}"?`);
    if (!ok) return;
    await window.fetch(`/api/admin/pricing-rules/${r.id}`, { method: "DELETE" });
    fetchRules();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="size-5 text-orange-500" /> Seasonal &amp; Dynamic Pricing
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Create price multipliers for holidays, peak seasons, weekends, and events.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
            <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={openAdd}>
            <Plus className="size-4 mr-1.5" /> New Rule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Rules</p>
          <p className="text-2xl font-bold text-slate-800">{rules.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Active Today</p>
          <p className="text-2xl font-bold text-orange-600">{activeTodayCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-400">{rules.filter(r => !r.isActive).length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[["", "All"], ["true", "Active"], ["false", "Inactive"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilterActive(val)}
            className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
              filterActive === val ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 hover:bg-slate-50")}>
            {label}
          </button>
        ))}
      </div>

      {/* Rules list */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Rule", "Type", "Scope", "Period", "Multiplier", "Priority", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No pricing rules found.</td></tr>
              ) : rules.map(r => {
                const active = isActive(r);
                const cfg    = TYPE_CFG[r.type];
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      {r.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.scope === "route"    ? <span className="text-xs text-indigo-600">{r.routeLabel}</span>
                      : r.scope === "bus_type" ? <span className="text-xs text-violet-600">{r.busType}</span>
                      : <span className="text-xs text-slate-400">All routes</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 text-slate-400" />
                        {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3"><MultiplierBadge m={r.multiplier} /></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {active
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs text-emerald-700 font-medium"><Zap className="size-3" /> Live</span>
                        : r.isActive
                          ? <span className="text-xs text-slate-400">Scheduled</span>
                          : <span className="text-xs text-slate-300">Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => toggleActive(r)} title={r.isActive ? "Deactivate" : "Activate"}>
                          {r.isActive ? <ToggleRight className="size-4 text-emerald-600" /> : <ToggleLeft className="size-4 text-slate-400" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 hover:bg-indigo-50" onClick={() => openEdit(r)}>
                          <Pencil className="size-3.5 text-indigo-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 hover:bg-red-50" onClick={() => handleDelete(r)}>
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRule ? "Edit Pricing Rule" : "New Pricing Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Rule Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Khmer New Year Peak" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RuleType }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value as RuleScope }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="all">All Routes</option>
                  <option value="route">Specific Route</option>
                  <option value="bus_type">Bus Type</option>
                </select>
              </div>
            </div>

            {form.scope === "route" && (
              <div className="space-y-1.5">
                <Label>Route</Label>
                <select value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select route…</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            )}

            {form.scope === "bus_type" && (
              <div className="space-y-1.5">
                <Label>Bus Type</Label>
                <select value={form.busType} onChange={e => setForm(f => ({ ...f, busType: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select type…</option>
                  {BUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price Multiplier <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.05" min="0.1" max="10" placeholder="1.3" value={form.multiplier}
                  onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))} />
                {form.multiplier && !isNaN(Number(form.multiplier)) && (
                  <p className={cn("text-xs", Number(form.multiplier) > 1 ? "text-red-600" : "text-emerald-600")}>
                    {Number(form.multiplier) > 1
                      ? `+${Math.round((Number(form.multiplier) - 1) * 100)}% price increase`
                      : `${Math.round((1 - Number(form.multiplier)) * 100)}% price discount`}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input type="number" min="1" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
                <p className="text-xs text-slate-400">Higher = applied first when rules overlap</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional note…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? "Saving…" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
