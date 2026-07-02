"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BusFront } from "lucide-react";

import SeatLayoutEditor from "@/components/booking/seat-layout-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AMENITY_OPTIONS, BUS_TYPES, type AmenityValue } from "@/lib/utils/constants";
import { AmenityIcon } from "@/lib/utils/amenity-icons";
import { formatBusType } from "@/lib/utils/formatters";
import type { BusDetailSummary, DriverSummary, RouteSummary } from "@/lib/db/queries";
import type { BusStop } from "@/types/bus";
import {
  type BusType,
  cloneSeatLayout,
  getSeatLayoutTemplate,
  isBusType,
  validateSeatLayout,
} from "@/lib/seat/seat-layout";

type StopEntry = BusStop & { id: string };

type FormState = {
  routeId: string;
  date: string;
  endDate: string;
  departureTime: string;
  arrivalTime: string;
  busType: BusType;
  pricePerSeat: string;
  seatLayout: ReturnType<typeof getSeatLayoutTemplate>;
  amenities: AmenityValue[];
  blockedSeats: string[];
  stops: StopEntry[];
  driverId: string | null;
  busDetailId: string | null;
  tierBusinessMultiplier: string;
  tierVipMultiplier: string;
};

export default function AddBusPageClient({ routes }: { routes: RouteSummary[] }) {
  const router = useRouter();

  const [form, setForm]               = useState<FormState>(() => defaultForm(routes));
  const [isPending, setIsPending]     = useState(false);
  const [error, setError]             = useState("");

  const [drivers, setDrivers]                 = useState<DriverSummary[]>([]);
  const [driversLoading, setDriversLoading]   = useState(false);
  const [driversError, setDriversError]       = useState("");

  const [busDetails, setBusDetails]               = useState<BusDetailSummary[]>([]);
  const [busDetailsLoading, setBusDetailsLoading] = useState(false);
  const [busDetailsError, setBusDetailsError]     = useState("");

  const [isSavingTemplate, setIsSavingTemplate]   = useState(false);
  const [templateSaveState, setTemplateSaveState] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [busyBusDetailIds, setBusyBusDetailIds]   = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds]         = useState<Set<string>>(new Set());
  const [conflictInfo, setConflictInfo]           = useState<Record<string, string>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Load drivers
  useEffect(() => {
    let mounted = true;
    setDriversLoading(true);
    fetch("/api/admin/drivers")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => { if (mounted) setDrivers(p?.drivers ?? []); })
      .catch(() => { if (mounted) setDriversError("Unable to load drivers."); })
      .finally(() => { if (mounted) setDriversLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Load bus details (vehicles)
  useEffect(() => {
    let mounted = true;
    setBusDetailsLoading(true);
    fetch("/api/admin/bus-details")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => { if (mounted) setBusDetails(p?.busDetails ?? []); })
      .catch(() => { if (mounted) setBusDetailsError("Unable to load vehicles."); })
      .finally(() => { if (mounted) setBusDetailsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Check availability on date/time changes
  useEffect(() => {
    if (!form.date || !form.departureTime || !form.arrivalTime) {
      setBusyBusDetailIds(new Set());
      setBusyDriverIds(new Set());
      setConflictInfo({});
      return;
    }
    let mounted = true;
    const controller = new AbortController();
    setAvailabilityLoading(true);
    const params = new URLSearchParams({
      date: form.date,
      departureTime: form.departureTime,
      arrivalTime: form.arrivalTime,
    });
    if (form.endDate && form.endDate >= form.date) params.set("endDate", form.endDate);

    fetch(`/api/admin/buses/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { busyBusDetailIds: [], busyDriverIds: [], conflictInfo: {} }))
      .then((data) => {
        if (mounted) {
          setBusyBusDetailIds(new Set(data.busyBusDetailIds ?? []));
          setBusyDriverIds(new Set(data.busyDriverIds ?? []));
          setConflictInfo(data.conflictInfo ?? {});
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setAvailabilityLoading(false); });
    return () => { mounted = false; controller.abort(); };
  }, [form.date, form.endDate, form.departureTime, form.arrivalTime]);

  const layoutValidation  = getLayoutValidation(form.seatLayout);
  const vehicleConflict   = Boolean(form.busDetailId) && busyBusDetailIds.has(form.busDetailId!);
  const driverConflict    = Boolean(form.driverId)    && busyDriverIds.has(form.driverId!);
  const hasConflict       = vehicleConflict || driverConflict;
  const selectedBusDetail = busDetails.find((d) => d.id === form.busDetailId) ?? null;

  /* ── Stop helpers ─────────────────────────────────────────────────── */
  function addStop() {
    setForm((cur) => {
      if (cur.stops.length === 0) {
        return { ...cur, stops: reindex([mkStop(), mkStop("", false, true)]) };
      }
      return {
        ...cur,
        stops: reindex([
          ...cur.stops.slice(0, cur.stops.length - 1),
          mkStop(),
          cur.stops[cur.stops.length - 1],
        ]),
      };
    });
  }

  function removeStop(id: string) {
    setForm((cur) => ({ ...cur, stops: reindex(cur.stops.filter((s) => s.id !== id)) }));
  }

  function updateStop(id: string, patch: Partial<StopEntry>) {
    setForm((cur) => ({
      ...cur,
      stops: reindex(cur.stops.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    }));
  }

  /* ── Save seat template ───────────────────────────────────────────── */
  async function saveSeatTemplate() {
    if (!form.busDetailId) {
      setTemplateSaveState({ type: "error", text: "Select a vehicle above before saving a reusable seat template." });
      return;
    }
    if (layoutValidation) {
      setTemplateSaveState({ type: "error", text: layoutValidation });
      return;
    }
    setIsSavingTemplate(true);
    setTemplateSaveState(null);
    try {
      const res = await fetch(`/api/admin/bus-details/${form.busDetailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busType: form.busType, seatLayoutTemplate: form.seatLayout }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.busDetail) {
        setTemplateSaveState({ type: "error", text: payload.message ?? "Unable to save the seat template." });
        return;
      }
      setBusDetails((cur) => cur.map((d) => (d.id === payload.busDetail?.id ? payload.busDetail : d)));
      setTemplateSaveState({ type: "success", text: "Seat template saved. Future departures can reuse this layout." });
    } catch {
      setTemplateSaveState({ type: "error", text: "Unable to save the seat template right now." });
    } finally {
      setIsSavingTemplate(false);
    }
  }

  /* ── Submit ───────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (layoutValidation) { setError(layoutValidation); return; }
    setIsPending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: form.routeId,
          date: form.date,
          departureTime: form.departureTime,
          arrivalTime: form.arrivalTime,
          busType: form.busType,
          pricePerSeat: Number(form.pricePerSeat),
          seatLayout: form.seatLayout,
          amenities: form.amenities,
          blockedSeats: form.blockedSeats,
          endDate: form.endDate,
          stops: form.stops.map((s) => ({ location: s.location, boarding: s.boarding, dropping: s.dropping })),
          driverId: form.driverId || null,
          busDetailId: form.busDetailId || null,
          seatTierMultipliers: {
            business: Number(form.tierBusinessMultiplier) || 1.3,
            vip:      Number(form.tierVipMultiplier)      || 1.6,
          },
        }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.message || "Unable to create the bus."); return; }
      router.push("/admin?tab=buses");
      router.refresh();
    } catch {
      setError("Unable to create the bus right now.");
    } finally {
      setIsPending(false);
    }
  }

  /* ── UI ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                <BusFront className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Add New Bus</h1>
                <p className="text-xs text-slate-500">Configure route, timing, vehicle, and seat layout</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-9 rounded-xl border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-bus-form"
              disabled={isPending || Boolean(layoutValidation) || hasConflict}
              className="h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100"
            >
              {isPending ? "Creating…" : "Create Bus"}
            </Button>
          </div>
        </div>
      </div>

      {/* Page body */}
      <form id="add-bus-form" onSubmit={handleSubmit}>
        <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

          {/* ── Step pills ──────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {["Route & Schedule", "Vehicle & Driver", "Pricing", "Amenities", "Stops", "Seat Layout"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>

          {/* ── 1: Route & Schedule ───────────────────────────────── */}
          <Section label="Route & Schedule" step={1}>
            <div className="p-5 grid gap-4 xl:grid-cols-6">
              <div className="space-y-1.5 xl:col-span-2">
                <Label className="text-sm font-semibold text-slate-700">Route <Required /></Label>
                <Select
                  value={form.routeId}
                  onValueChange={(v) => { if (!v) return; setForm((c) => ({ ...c, routeId: v })); }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select a route">
                      {(() => { const r = routes.find((r) => r.id === form.routeId); return r ? `${r.from} → ${r.to}` : undefined; })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.from} → {r.to}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FieldCol label="Start Date" required>
                <Input type="date" value={form.date} required
                  onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200" />
              </FieldCol>

              <FieldCol label="End Date" note="optional">
                <Input type="date" value={form.endDate}
                  onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200" />
                <p className="text-[11px] text-slate-400">Repeats daily. Leave empty for a single departure.</p>
              </FieldCol>

              <FieldCol label="Departure" required>
                <Input type="time" value={form.departureTime} required
                  onChange={(e) => setForm((c) => ({ ...c, departureTime: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200" />
              </FieldCol>

              <FieldCol label="Arrival" required>
                <Input type="time" value={form.arrivalTime} required
                  onChange={(e) => setForm((c) => ({ ...c, arrivalTime: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200" />
              </FieldCol>
            </div>
          </Section>

          {/* ── 2: Vehicle & Driver ───────────────────────────────── */}
          <Section label="Vehicle & Driver Assignment" step={2}>
            <div className="p-5 grid gap-5 md:grid-cols-2">
              {/* Vehicle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Assigned Vehicle</Label>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {busDetails.length - busyBusDetailIds.size}/{busDetails.length} free
                    {availabilityLoading && <span className="text-slate-400"> · checking…</span>}
                  </span>
                </div>
                <Select value={form.busDetailId ?? ""}
                  onValueChange={(v) => {
                    const d = busDetails.find((d) => d.id === v);
                    setTemplateSaveState(null);
                    setForm((c) => {
                      if (!d) return { ...c, busDetailId: v || null };
                      const tpl = d.seatLayoutTemplate ?? getSeatLayoutTemplate(d.busType);
                      return { ...c, busDetailId: v, busType: d.busType, seatLayout: structuredClone(tpl) };
                    });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select a vehicle or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {busDetails.map((d) => {
                      const busy = busyBusDetailIds.has(d.id);
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={busy}>
                          {d.name} · {d.registrationNumber}
                          {busy && <span className="ml-2 text-[10px] font-bold text-red-500">· Busy{conflictInfo[d.id] ? ` ${conflictInfo[d.id]}` : ""}</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {vehicleConflict ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                    ⚠ This vehicle is already assigned at this time.
                  </p>
                ) : busDetailsLoading ? (
                  <p className="text-[11px] text-slate-400">Loading vehicles…</p>
                ) : busDetailsError ? (
                  <p className="text-[11px] text-red-600">{busDetailsError}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">Pick a saved vehicle so passengers see a consistent fleet.</p>
                )}
              </div>

              {/* Driver */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">
                    Assigned Driver <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </Label>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {drivers.length - busyDriverIds.size}/{drivers.length} free
                    {availabilityLoading && <span className="text-slate-400"> · checking…</span>}
                  </span>
                </div>
                <Select value={form.driverId ?? ""}
                  onValueChange={(v) => setForm((c) => ({ ...c, driverId: v || null }))}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {drivers.map((d) => {
                      const busy = busyDriverIds.has(d.id);
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={busy}>
                          {d.name} · {d.phone}
                          {busy && <span className="ml-2 text-[10px] font-bold text-red-500">· Busy{conflictInfo[d.id] ? ` ${conflictInfo[d.id]}` : ""}</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {driverConflict ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                    ⚠ This driver is already assigned at this time.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {driversLoading ? "Loading driver roster…" : drivers.length === 0 ? "Add a driver first before assigning." : "Choose the driver who will operate this departure."}
                  </p>
                )}
                {driversError && <p className="text-[11px] text-red-600">{driversError}</p>}
              </div>
            </div>
          </Section>

          {/* ── 3: Bus Type & Pricing ─────────────────────────────── */}
          <Section label="Bus Type & Pricing" step={3}>
            <div className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldCol label="Bus Type">
                  <Select value={form.busType}
                    onValueChange={(v) => {
                      if (!isBusType(v)) return;
                      setTemplateSaveState(null);
                      setForm((c) => ({ ...c, busType: v, seatLayout: getSeatLayoutTemplate(v) }));
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Choose bus type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUS_TYPES.map((t) => <SelectItem key={t} value={t}>{formatBusType(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldCol>
                <FieldCol label="Base Price per Seat ($)" required>
                  <Input type="number" min={1} value={form.pricePerSeat} required
                    onChange={(e) => setForm((c) => ({ ...c, pricePerSeat: e.target.value }))}
                    className="h-10 rounded-xl border-slate-200" />
                </FieldCol>
              </div>

              {/* Tier pricing */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Seat Tier Pricing</p>
                  <p className="text-xs text-slate-500 mt-0.5">Standard is always 1.0×. Assign tiers per seat in the layout editor below.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Standard</p>
                    <p className="text-base font-bold text-slate-700 mt-1">1.0×</p>
                    <p className="text-[10px] text-slate-400">${Number(form.pricePerSeat || 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-blue-200 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Business</p>
                    <Input type="number" step="0.05" min="1" max="5"
                      value={form.tierBusinessMultiplier}
                      onChange={(e) => setForm((c) => ({ ...c, tierBusinessMultiplier: e.target.value }))}
                      className="h-8 text-center text-base font-bold text-blue-700 border-0 bg-transparent focus:ring-0 p-0 mt-1" />
                    <p className="text-[10px] text-slate-400">${(Number(form.pricePerSeat || 0) * Number(form.tierBusinessMultiplier || 1.3)).toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-amber-200 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">VIP</p>
                    <Input type="number" step="0.05" min="1" max="5"
                      value={form.tierVipMultiplier}
                      onChange={(e) => setForm((c) => ({ ...c, tierVipMultiplier: e.target.value }))}
                      className="h-8 text-center text-base font-bold text-amber-700 border-0 bg-transparent focus:ring-0 p-0 mt-1" />
                    <p className="text-[10px] text-slate-400">${(Number(form.pricePerSeat || 0) * Number(form.tierVipMultiplier || 1.6)).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── 4: Amenities ──────────────────────────────────────── */}
          <Section label="Bus Amenities" step={4} badge={`${form.amenities.length} selected`}>
            <div className="p-5">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {AMENITY_OPTIONS.map((a) => {
                  const checked = form.amenities.includes(a.value as AmenityValue);
                  return (
                    <label key={a.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        checked ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Checkbox id={`a-${a.value}`} checked={checked}
                        onCheckedChange={(c) => setForm((cur) => ({
                          ...cur,
                          amenities: c
                            ? [...cur.amenities, a.value as AmenityValue]
                            : cur.amenities.filter((x) => x !== a.value),
                        }))}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className={`flex items-center gap-2 text-sm font-medium ${checked ? "text-indigo-800" : "text-slate-700"}`}>
                        <AmenityIcon value={a.value} className="size-4 shrink-0" />
                        {a.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* ── 5: Stops ──────────────────────────────────────────── */}
          <Section label="Boarding & Drop-off Stops" step={5}
            action={<Button type="button" variant="outline" className="h-8 rounded-xl text-xs font-semibold" onClick={addStop}>+ Add Stop</Button>}
          >
            <div className="p-5 space-y-2.5">
              {form.stops.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No stops added yet. Click "+ Add Stop" to add boarding / drop-off points.</p>
              ) : (
                form.stops.map((stop, i) => (
                  <div key={stop.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 md:grid-cols-[1fr_auto_auto_auto]">
                    <Input value={stop.location} placeholder="Stop location"
                      onChange={(e) => updateStop(stop.id, { location: e.target.value })}
                      className="h-9 rounded-xl border-slate-200 bg-white text-sm" />
                    <div className="flex items-center gap-2">
                      <Checkbox checked={stop.boarding}
                        onCheckedChange={(c) => updateStop(stop.id, { boarding: Boolean(c) })}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                      <span className="text-sm font-medium text-slate-700">Boarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={stop.dropping}
                        onCheckedChange={(c) => updateStop(stop.id, { dropping: Boolean(c) })}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                      <span className="text-sm font-medium text-slate-700">Drop-off</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm"
                      className="h-9 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold"
                      onClick={() => removeStop(stop.id)}
                      disabled={i === 0 || i === form.stops.length - 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* ── 6: Seat Layout ────────────────────────────────────── */}
          <Section label="Seat Layout & Blocking" step={6}
            note={selectedBusDetail
              ? `Saving updates the reusable layout for ${selectedBusDetail.name}.`
              : "Select a vehicle above to save as a reusable template."}
            action={
              <Button type="button" variant="outline"
                className="h-8 rounded-xl text-xs font-semibold border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                disabled={isSavingTemplate || !form.busDetailId || Boolean(layoutValidation)}
                onClick={saveSeatTemplate}
              >
                {isSavingTemplate ? "Saving…" : "Save as Vehicle Template"}
              </Button>
            }
          >
            <div className="p-5 bg-slate-50/30">
              <SeatLayoutEditor
                busType={form.busType}
                value={form.seatLayout}
                bookedSeats={[]}
                blockedSeats={form.blockedSeats}
                onChange={(sl) => setForm((c) => ({ ...c, seatLayout: sl }))}
                onBlockedSeatsChange={(bs) => setForm((c) => ({ ...c, blockedSeats: bs }))}
              />
            </div>
            {templateSaveState && (
              <div className={`mx-5 mb-5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                templateSaveState.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {templateSaveState.text}
              </div>
            )}
          </Section>

          {/* ── Error + bottom submit ─────────────────────────────── */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              ⚠️ {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <Button type="button" variant="outline" onClick={() => router.back()}
              className="h-10 rounded-xl border-slate-300 text-slate-700">
              Cancel
            </Button>
            <Button type="submit"
              disabled={isPending || Boolean(layoutValidation) || hasConflict}
              className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-8 shadow-md shadow-indigo-100"
            >
              {isPending ? "Creating…" : "Create Bus"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function Section({
  label, step, note, badge, action, children,
}: {
  label: string; step: number; note?: string; badge?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{step}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</p>
            {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{badge}</span>
          )}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldCol({
  label, note, required, children,
}: {
  label: string; note?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-700">
        {label} {required && <Required />}
        {note && <span className="text-xs font-normal text-slate-400 ml-1">({note})</span>}
      </Label>
      {children}
    </div>
  );
}

function Required() {
  return <span className="text-red-500">*</span>;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getLayoutValidation(layout: ReturnType<typeof getSeatLayoutTemplate>) {
  try {
    validateSeatLayout(layout, []);
    return "";
  } catch (e) {
    return e instanceof Error ? e.message : "Seat layout is invalid.";
  }
}

function defaultForm(routes: RouteSummary[]): FormState {
  const t: BusType  = "mini_bus";
  const route = routes[0];
  return {
    routeId:               routes[0]?.id ?? "",
    date:                  "",
    endDate:               "",
    departureTime:         "08:00",
    arrivalTime:           "14:00",
    busType:               t,
    pricePerSeat:          "18",
    seatLayout:            getSeatLayoutTemplate(t),
    amenities:             [],
    blockedSeats:          [],
    stops:                 route ? defaultStops(route) : [],
    driverId:              null,
    busDetailId:           null,
    tierBusinessMultiplier: "1.3",
    tierVipMultiplier:      "1.6",
  };
}

function defaultStops(route: RouteSummary): StopEntry[] {
  return [
    { id: `s-${route.id}-from`, location: route.from, boarding: true, dropping: false, order: 0 },
    { id: `s-${route.id}-to`,   location: route.to,   boarding: false, dropping: true,  order: 1 },
  ];
}

function mkStop(location = "", boarding = true, dropping = true): StopEntry {
  return { id: `stop-${Math.random().toString(16).slice(2)}`, location, boarding, dropping, order: 0 };
}

function reindex(stops: StopEntry[]): StopEntry[] {
  return stops.map((s, i) => ({ ...s, order: i }));
}
