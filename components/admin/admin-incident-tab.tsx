"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Plus, MoreVertical, Pencil, Trash2,
  CheckCircle2, Clock, MapPin, DollarSign, RefreshCw,
  ChevronLeft, ChevronRight, ListFilter, X, Car,
  Zap, CloudRain, Flame, Wrench, Bus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmDelete, toastSuccess, toastError } from "@/lib/utils/swal";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/formatters";

/* ── constants ─────────────────────────────────────────────────── */
const INCIDENT_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  breakdown:      { label: "Breakdown",      icon: Wrench,        color: "bg-orange-100 text-orange-700 border-orange-200" },
  accident:       { label: "Accident",       icon: Car,           color: "bg-red-100 text-red-700 border-red-200"          },
  flat_tire:      { label: "Flat Tire",      icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-200"    },
  engine_failure: { label: "Engine Failure", icon: Flame,         color: "bg-rose-100 text-rose-700 border-rose-200"       },
  electrical:     { label: "Electrical",     icon: Zap,           color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  flood_damage:   { label: "Flood Damage",   icon: CloudRain,     color: "bg-blue-100 text-blue-700 border-blue-200"       },
  other:          { label: "Other",          icon: Bus,           color: "bg-slate-100 text-slate-600 border-slate-200"    },
};

const SEVERITIES: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700"    },
  high:   { label: "High",   color: "bg-red-100 text-red-700"        },
};

/* ── types ──────────────────────────────────────────────────────── */
type Incident = {
  _id: string;
  busDetailId: { _id: string; name: string; registrationNumber: string } | string;
  date: string;
  incidentType: string;
  severity: string;
  location: string;
  description: string;
  resolution?: string;
  status: "open" | "resolved";
  cost?: number;
  reportedBy?: string;
  createdAt: string;
};

type BusOption = { id: string; name: string; registrationNumber: string };

type IncidentForm = {
  busDetailId: string;
  date: string;
  incidentType: string;
  severity: string;
  location: string;
  description: string;
  resolution: string;
  cost: string;
  reportedBy: string;
};

const EMPTY_FORM: IncidentForm = {
  busDetailId: "",
  date: new Date().toISOString().slice(0, 10),
  incidentType: "breakdown",
  severity: "medium",
  location: "",
  description: "",
  resolution: "",
  cost: "",
  reportedBy: "",
};

const PAGE_SIZE = 15;

function busLabel(b: Incident["busDetailId"]) {
  if (typeof b === "string") return b;
  return `${b.name} · ${b.registrationNumber}`;
}

/* ── component ──────────────────────────────────────────────────── */
export default function AdminIncidentTab() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [busOptions, setBusOptions]     = useState<BusOption[]>([]);

  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<Incident | null>(null);
  const [form, setForm]           = useState<IncidentForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      skip:  String((page - 1) * PAGE_SIZE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    try {
      const res  = await fetch(`/api/admin/incidents?${params}`);
      const data = await res.json();
      setIncidents(data.incidents ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toastError("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // Load bus list for the form dropdown
  useEffect(() => {
    fetch("/api/admin/bus-details")
      .then((r) => r.json())
      .then((d) => setBusOptions(d.busDetails ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd()  { setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) }); setShowForm(true); }
  function openEdit(i: Incident) {
    setEditTarget(i);
    const bid = typeof i.busDetailId === "string" ? i.busDetailId : i.busDetailId._id;
    setForm({
      busDetailId:  bid,
      date:         i.date.slice(0, 10),
      incidentType: i.incidentType,
      severity:     i.severity,
      location:     i.location,
      description:  i.description,
      resolution:   i.resolution ?? "",
      cost:         i.cost != null ? String(i.cost) : "",
      reportedBy:   i.reportedBy ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.busDetailId) { toastError("Please select a vehicle"); return; }
    if (!form.location.trim())   { toastError("Location is required");    return; }
    if (!form.description.trim()) { toastError("Description is required"); return; }
    setSaving(true);
    try {
      const url    = editTarget ? `/api/admin/incidents/${editTarget._id}` : "/api/admin/incidents";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cost: form.cost ? Number(form.cost) : undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to save"); return; }
      toastSuccess(editTarget ? "Incident updated" : "Incident logged");
      setShowForm(false);
      setEditTarget(null);
      load();
    } catch {
      toastError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(i: Incident) {
    if (!(await confirmDelete(`${INCIDENT_TYPES[i.incidentType]?.label ?? i.incidentType} on ${new Date(i.date).toLocaleDateString()}`))) return;
    try {
      const res = await fetch(`/api/admin/incidents/${i._id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toastError(j.message ?? "Delete failed"); return; }
      toastSuccess("Incident deleted");
      load();
    } catch {
      toastError("Request failed");
    }
  }

  async function markResolved(i: Incident) {
    if (i.status === "resolved") return;
    try {
      const res = await fetch(`/api/admin/incidents/${i._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!res.ok) { toastError("Failed to update"); return; }
      toastSuccess("Marked as resolved");
      load();
    } catch {
      toastError("Request failed");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const openCount     = incidents.filter((i) => i.status === "open").length;
  const highCount     = incidents.filter((i) => i.severity === "high").length;

  const filtered = typeFilter === "all" ? incidents : incidents.filter((i) => i.incidentType === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Incident &amp; Breakdown Log</h2>
          <p className="text-sm text-slate-500 mt-1">Track unexpected breakdowns, accidents, and road incidents</p>
        </div>
        <Button
          onClick={openAdd}
          className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold px-5 gap-2 shadow-md shadow-rose-100"
        >
          <Plus className="h-4 w-4" /> Log Incident
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Logged", value: total,    color: "indigo" },
          { label: "Open",         value: openCount,  color: "amber"  },
          { label: "High Severity",value: highCount,  color: "red"    },
          { label: "Resolved",     value: total - openCount, color: "emerald" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl bg-${color}-50 border border-${color}-100 px-5 py-4`}>
            <p className={`text-xs uppercase tracking-wide text-${color}-500 font-semibold`}>{label}</p>
            <p className={`text-3xl font-bold text-${color}-700 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ListFilter className="h-4 w-4" /> Filter:
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 rounded-xl text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "")}>
          <SelectTrigger className="h-9 w-44 rounded-xl text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No incidents found</p>
            <p className="text-sm mt-1">Click "Log Incident" to record the first one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date &amp; Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Vehicle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Cost</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((incident) => {
                const cfg = INCIDENT_TYPES[incident.incidentType] ?? INCIDENT_TYPES.other;
                const Icon = cfg.icon;
                const sev  = SEVERITIES[incident.severity] ?? SEVERITIES.medium;
                return (
                  <tr key={incident._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", cfg.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{cfg.label}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(incident.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <p className="font-medium text-slate-800 text-xs">{busLabel(incident.busDetailId)}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{incident.location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", sev.color)}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-slate-700 text-xs font-semibold">
                      {incident.cost != null ? formatCurrency(incident.cost) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {incident.status === "resolved" ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 w-fit">
                          <Clock className="h-3 w-3" /> Open
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                            onClick={() => openEdit(incident)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {incident.status === "open" && (
                            <DropdownMenuItem className="gap-2 text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                              onClick={() => markResolved(incident)}>
                              <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                            onClick={() => handleDelete(incident)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editTarget ? "Edit Incident" : "Log New Incident"}
            </DialogTitle>
            <DialogDescription>
              {editTarget ? "Update incident details." : "Record an unexpected breakdown, accident, or road incident."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Vehicle */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Vehicle <span className="text-red-500">*</span></Label>
              <Select value={form.busDetailId} onValueChange={(v) => setForm((f) => ({ ...f, busDetailId: v ?? "" }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {busOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} · {b.registrationNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="h-11 rounded-xl"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Incident Type <span className="text-red-500">*</span></Label>
                <Select value={form.incidentType} onValueChange={(v) => setForm((f) => ({ ...f, incidentType: v ?? "" }))}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Severity */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Severity <span className="text-red-500">*</span></Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v ?? "" }))}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Repair Cost <span className="text-slate-400 font-normal">(USD)</span></Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" min={0} className="pl-9 h-11 rounded-xl"
                    placeholder="0"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Location <span className="text-red-500">*</span></Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-9 h-11 rounded-xl"
                  placeholder="e.g. National Road 6, Kampong Cham"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Description <span className="text-red-500">*</span></Label>
              <Textarea className="rounded-xl min-h-[80px] resize-none"
                placeholder="Describe what happened…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Resolution */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Resolution <span className="text-slate-400 font-normal">(leave blank if still open)</span></Label>
              <Textarea className="rounded-xl min-h-[60px] resize-none"
                placeholder="How was this resolved?"
                value={form.resolution}
                onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))} />
            </div>

            {/* Reported by */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Reported By</Label>
              <Input className="h-11 rounded-xl"
                placeholder="Driver or staff name"
                value={form.reportedBy}
                onChange={(e) => setForm((f) => ({ ...f, reportedBy: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl"
              onClick={() => { setShowForm(false); setEditTarget(null); }} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white">
              {saving
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                : editTarget ? "Save Changes" : "Log Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
