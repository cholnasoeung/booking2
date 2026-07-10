"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  MapPin, Plus, RefreshCw, Pencil, Trash2, GripVertical,
  Clock, Navigation, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmDelete } from "@/lib/utils/swal";

type RouteOption = { id: string; from: string; to: string; label: string };
type Stop = {
  id: string; routeId: string; name: string; city: string;
  arrivalOffset: number; order: number;
  isPickup: boolean; isDrop: boolean;
  address: string | null; landmark: string | null;
  lat: number | null; lng: number | null;
};

function offsetToTime(depTime: string, offset: number) {
  if (!depTime) return `+${offset}m`;
  const [h, m] = depTime.split(":").map(Number);
  const total  = h * 60 + m + offset;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const EMPTY_FORM = { name: "", city: "", arrivalOffset: "0", order: "", isPickup: true, isDrop: true, address: "", landmark: "" };

export default function AdminRouteStopsTab() {
  const [routes, setRoutes]         = useState<RouteOption[]>([]);
  const [stops, setStops]           = useState<Stop[]>([]);
  const [loading, setLoading]       = useState(false);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [depTime, setDepTime]       = useState("06:00");
  const [, startTransition]         = useTransition();

  const [dlgOpen, setDlgOpen]   = useState(false);
  const [editStop, setEditStop] = useState<Stop | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const fetchStops = useCallback(async () => {
    setLoading(true);
    const q = selectedRoute ? `?routeId=${selectedRoute}` : "";
    const res = await window.fetch(`/api/admin/route-stops${q}`);
    if (res.ok) {
      const data = await res.json();
      setRoutes(data.routes);
      setStops(data.stops);
    }
    setLoading(false);
  }, [selectedRoute]);

  useEffect(() => { startTransition(() => { fetchStops(); }); }, [fetchStops]);

  function openAdd() {
    setEditStop(null);
    setForm({ ...EMPTY_FORM, order: String(stops.length) });
    setError(""); setDlgOpen(true);
  }

  function openEdit(s: Stop) {
    setEditStop(s);
    setForm({
      name: s.name, city: s.city,
      arrivalOffset: String(s.arrivalOffset),
      order: String(s.order),
      isPickup: s.isPickup, isDrop: s.isDrop,
      address: s.address ?? "", landmark: s.landmark ?? "",
    });
    setError(""); setDlgOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.city.trim()) { setError("Name and city are required."); return; }
    if (!selectedRoute && !editStop) { setError("Please select a route first."); return; }
    setSaving(true); setError("");
    try {
      let res: Response;
      const payload = {
        routeId:       selectedRoute || editStop?.routeId,
        name:          form.name.trim(),
        city:          form.city.trim(),
        arrivalOffset: Number(form.arrivalOffset),
        order:         Number(form.order),
        isPickup:      form.isPickup,
        isDrop:        form.isDrop,
        address:       form.address.trim() || undefined,
        landmark:      form.landmark.trim() || undefined,
      };
      if (editStop) {
        res = await window.fetch(`/api/admin/route-stops/${editStop.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        res = await window.fetch("/api/admin/route-stops", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Failed."); return; }
      setDlgOpen(false); fetchStops();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function handleDelete(s: Stop) {
    const ok = await confirmDelete(`Remove stop "${s.name}" from the route?`);
    if (!ok) return;
    await window.fetch(`/api/admin/route-stops/${s.id}`, { method: "DELETE" });
    fetchStops();
  }

  async function moveStop(s: Stop, dir: "up" | "down") {
    const newOrder = dir === "up" ? s.order - 1 : s.order + 1;
    if (newOrder < 0 || newOrder >= stops.length) return;
    await window.fetch(`/api/admin/route-stops/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder }),
    });
    fetchStops();
  }

  const filteredStops = selectedRoute
    ? stops.filter(s => s.routeId === selectedRoute).sort((a, b) => a.order - b.order)
    : stops.sort((a, b) => a.routeId.localeCompare(b.routeId) || a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="size-5 text-teal-600" /> Route Stops &amp; Waypoints
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Define intermediate pickup and drop-off points for each route.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStops} disabled={loading}>
            <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={openAdd} disabled={!selectedRoute}>
            <Plus className="size-4 mr-1.5" /> Add Stop
          </Button>
        </div>
      </div>

      {/* Route selector + departure time */}
      <div className="flex flex-wrap gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <Label className="text-xs text-slate-500">Route</Label>
          <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— All routes —</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500">Reference Departure Time</Label>
          <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-9 w-32" />
        </div>
        {!selectedRoute && (
          <p className="w-full text-xs text-amber-600 self-end">Select a route above to add stops or see the timeline.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <span className="text-sm font-medium text-slate-700">{filteredStops.length} stop{filteredStops.length !== 1 ? "s" : ""}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="size-3" /> Arrival time based on departure at {depTime}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading…</div>
        ) : filteredStops.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            {selectedRoute ? "No stops yet. Click \"Add Stop\" to get started." : "Select a route to view its stops."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStops.map((s, i) => {
              const isFirst = i === 0;
              const isLast  = i === filteredStops.length - 1;
              return (
                <div key={s.id} className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50 transition-colors group">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-0.5 shrink-0">
                    <div className={cn("size-3 rounded-full border-2",
                      isFirst ? "bg-teal-500 border-teal-500" : isLast ? "bg-slate-500 border-slate-500" : "bg-white border-teal-400")} />
                    {!isLast && <div className="w-0.5 h-10 bg-teal-200 mt-1" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.city}{s.address ? ` · ${s.address}` : ""}{s.landmark ? ` · Near ${s.landmark}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-mono font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded px-2 py-0.5">
                          {offsetToTime(depTime, s.arrivalOffset)}
                        </span>
                        <span className="text-xs text-slate-400">(+{s.arrivalOffset}m)</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {s.isPickup && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 font-medium">
                          <Navigation className="size-2.5" /> Pick-up
                        </span>
                      )}
                      {s.isDrop && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs text-amber-700 font-medium">
                          <MapPin className="size-2.5" /> Drop-off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                    <Button size="icon" variant="ghost" className="size-7" disabled={isFirst} onClick={() => moveStop(s, "up")}>
                      <ChevronUp className="size-3.5 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" disabled={isLast} onClick={() => moveStop(s, "down")}>
                      <ChevronDown className="size-3.5 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 hover:bg-indigo-50" onClick={() => openEdit(s)}>
                      <Pencil className="size-3.5 text-indigo-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 hover:bg-red-50" onClick={() => handleDelete(s)}>
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editStop ? "Edit Stop" : "Add Stop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stop Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Kampot Station" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>City <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Kampot" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Arrival Offset (minutes)</Label>
                <Input type="number" min={0} placeholder="e.g. 90" value={form.arrivalOffset} onChange={e => setForm(f => ({ ...f, arrivalOffset: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Position (order)</Label>
                <Input type="number" min={0} value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="Street address (optional)" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Landmark</Label>
              <Input placeholder="Near landmark (optional)" value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPickup} onChange={e => setForm(f => ({ ...f, isPickup: e.target.checked }))} className="rounded" />
                Pick-up point
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isDrop} onChange={e => setForm(f => ({ ...f, isDrop: e.target.checked }))} className="rounded" />
                Drop-off point
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Save Stop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
