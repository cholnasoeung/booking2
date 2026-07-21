"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BusFront, CalendarDays,
  Car, Check, ChevronRight, Leaf, MapPin, Sofa, Utensils,
} from "lucide-react";

import SeatLayoutEditor from "@/components/booking/seat-layout-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AMENITY_OPTIONS, BUS_TYPES, type AmenityValue } from "@/lib/utils/constants";
import { AmenityIcon } from "@/lib/utils/amenity-icons";
import { formatBusType } from "@/lib/utils/formatters";
import type { BusDetailSummary, DriverSummary, RouteSummary } from "@/lib/db/queries";
import type { BusStop } from "@/types/bus";
import {
  type BusType, getSeatLayoutTemplate, isBusType, validateSeatLayout,
} from "@/lib/seat/seat-layout";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────── */
type StopEntry = BusStop & { id: string };
type FormState = {
  routeId: string; date: string; endDate: string;
  departureTime: string; arrivalTime: string;
  busType: BusType; pricePerSeat: string;
  seatLayout: ReturnType<typeof getSeatLayoutTemplate>;
  amenities: AmenityValue[]; blockedSeats: string[]; stops: StopEntry[];
  driverId: string | null; busDetailId: string | null;
  tierBusinessMultiplier: string; tierVipMultiplier: string;
};

const STEPS = [
  { id: 1, label: "Route",     shortLabel: "Route & Schedule",     icon: MapPin      },
  { id: 2, label: "Vehicle",   shortLabel: "Vehicle & Driver",     icon: Car         },
  { id: 3, label: "Pricing",   shortLabel: "Bus Type & Pricing",   icon: Leaf        },
  { id: 4, label: "Amenities", shortLabel: "Amenities",            icon: Sofa        },
  { id: 5, label: "Stops",     shortLabel: "Boarding Stops",       icon: CalendarDays},
  { id: 6, label: "Layout",    shortLabel: "Seat Layout",          icon: Utensils    },
] as const;

/* ── Main component ─────────────────────────────────────────────────── */
export default function AddBusPageClient({ routes }: { routes: RouteSummary[] }) {
  const router = useRouter();
  const [step, setStep]         = useState(1);
  const [visited, setVisited]   = useState(new Set([1]));
  const [form, setForm]         = useState<FormState>(() => defaultForm(routes));
  const [isPending, setIsPending] = useState(false);
  const [error, setError]       = useState("");

  const [drivers, setDrivers]                   = useState<DriverSummary[]>([]);
  const [driversLoading, setDriversLoading]     = useState(false);
  const [driversError, setDriversError]         = useState("");
  const [busDetails, setBusDetails]             = useState<BusDetailSummary[]>([]);
  const [busDetailsLoading, setBusDetailsLoading] = useState(false);
  const [busDetailsError, setBusDetailsError]   = useState("");
  const [templateSaveState, setTemplateSaveState] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [busyBusDetailIds, setBusyBusDetailIds] = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds]       = useState<Set<string>>(new Set());
  const [conflictInfo, setConflictInfo]         = useState<Record<string, string>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  /* ── Data loading ───────────────────────────────────────────────── */
  useEffect(() => {
    let m = true;
    setDriversLoading(true);
    fetch("/api/admin/drivers")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => { if (m) setDrivers(p?.drivers ?? []); })
      .catch(() => { if (m) setDriversError("Unable to load drivers."); })
      .finally(() => { if (m) setDriversLoading(false); });
    return () => { m = false; };
  }, []);

  useEffect(() => {
    let m = true;
    setBusDetailsLoading(true);
    fetch("/api/admin/bus-details")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => { if (m) setBusDetails(p?.busDetails ?? []); })
      .catch(() => { if (m) setBusDetailsError("Unable to load vehicles."); })
      .finally(() => { if (m) setBusDetailsLoading(false); });
    return () => { m = false; };
  }, []);

  useEffect(() => {
    if (!form.date || !form.departureTime || !form.arrivalTime) {
      setBusyBusDetailIds(new Set()); setBusyDriverIds(new Set()); setConflictInfo({});
      return;
    }
    let m = true;
    const ctrl = new AbortController();
    setAvailabilityLoading(true);
    const p = new URLSearchParams({ date: form.date, departureTime: form.departureTime, arrivalTime: form.arrivalTime });
    if (form.endDate && form.endDate >= form.date) p.set("endDate", form.endDate);
    fetch(`/api/admin/buses/availability?${p}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { busyBusDetailIds: [], busyDriverIds: [], conflictInfo: {} }))
      .then((d) => { if (m) { setBusyBusDetailIds(new Set(d.busyBusDetailIds ?? [])); setBusyDriverIds(new Set(d.busyDriverIds ?? [])); setConflictInfo(d.conflictInfo ?? {}); } })
      .catch(() => {}).finally(() => { if (m) setAvailabilityLoading(false); });
    return () => { m = false; ctrl.abort(); };
  }, [form.date, form.endDate, form.departureTime, form.arrivalTime]);

  /* ── Derived ────────────────────────────────────────────────────── */
  const layoutValidation  = getLayoutValidation(form.seatLayout);
  const vehicleConflict   = Boolean(form.busDetailId) && busyBusDetailIds.has(form.busDetailId!);
  const driverConflict    = Boolean(form.driverId)    && busyDriverIds.has(form.driverId!);
  const selectedBusDetail = busDetails.find((d) => d.id === form.busDetailId) ?? null;

  /* ── Navigation ─────────────────────────────────────────────────── */
  function goTo(n: number) {
    setStep(n);
    setVisited((prev) => new Set([...prev, n]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function next() { if (step < 6) goTo(step + 1); }
  function prev() { if (step > 1) goTo(step - 1); }

  /* ── Stop helpers ───────────────────────────────────────────────── */
  function addStop() {
    setForm((cur) => {
      if (cur.stops.length === 0) return { ...cur, stops: reindex([mkStop(), mkStop("", false, true)]) };
      return { ...cur, stops: reindex([...cur.stops.slice(0, -1), mkStop(), cur.stops[cur.stops.length - 1]]) };
    });
  }
  function removeStop(id: string) { setForm((c) => ({ ...c, stops: reindex(c.stops.filter((s) => s.id !== id)) })); }
  function updateStop(id: string, patch: Partial<StopEntry>) { setForm((c) => ({ ...c, stops: reindex(c.stops.map((s) => s.id === id ? { ...s, ...patch } : s)) })); }

  /* ── Save template ──────────────────────────────────────────────── */
  async function saveSeatTemplate() {
    if (!form.busDetailId) { setTemplateSaveState({ type: "error", text: "Select a vehicle first." }); return; }
    if (layoutValidation)  { setTemplateSaveState({ type: "error", text: layoutValidation }); return; }
    setIsSavingTemplate(true); setTemplateSaveState(null);
    try {
      const res = await fetch(`/api/admin/bus-details/${form.busDetailId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busType: form.busType, seatLayoutTemplate: form.seatLayout }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.busDetail) { setTemplateSaveState({ type: "error", text: payload.message ?? "Unable to save." }); return; }
      setBusDetails((c) => c.map((d) => (d.id === payload.busDetail?.id ? payload.busDetail : d)));
      setTemplateSaveState({ type: "success", text: "Template saved for this vehicle." });
    } catch { setTemplateSaveState({ type: "error", text: "Unable to save right now." }); }
    finally { setIsSavingTemplate(false); }
  }

  /* ── Submit ─────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (layoutValidation) { setError(layoutValidation); return; }
    setIsPending(true); setError("");
    try {
      const res = await fetch("/api/admin/buses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: form.routeId, date: form.date, departureTime: form.departureTime,
          arrivalTime: form.arrivalTime, busType: form.busType, pricePerSeat: Number(form.pricePerSeat),
          seatLayout: form.seatLayout, amenities: form.amenities, blockedSeats: form.blockedSeats,
          endDate: form.endDate, stops: form.stops.map(({ location, boarding, dropping }) => ({ location, boarding, dropping })),
          driverId: form.driverId || null, busDetailId: form.busDetailId || null,
          seatTierMultipliers: { business: Number(form.tierBusinessMultiplier) || 1.3, vip: Number(form.tierVipMultiplier) || 1.6 },
        }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.message || "Unable to create the bus."); return; }
      router.push("/admin?tab=buses");
      router.refresh();
    } catch { setError("Unable to create the bus right now."); }
    finally { setIsPending(false); }
  }

  /* ── Progress summary for header ────────────────────────────────── */
  const routeObj = routes.find((r) => r.id === form.routeId);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
              <BusFront className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Add New Bus</h1>
              <p className="text-xs text-slate-400 truncate">
                {routeObj ? `${routeObj.from} → ${routeObj.to}` : "Configure this departure"}
              </p>
            </div>
          </div>

          {/* Step pills — desktop */}
          <div className="hidden lg:flex items-center gap-1 mx-4 flex-1 justify-center">
            {STEPS.map((s, i) => {
              const done    = visited.has(s.id) && s.id !== step;
              const active  = s.id === step;
              const Icon    = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => visited.has(s.id) && goTo(s.id)}
                  disabled={!visited.has(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    active  && "bg-indigo-600 text-white shadow-sm",
                    done    && "bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100",
                    !active && !done && "text-slate-400 cursor-default"
                  )}
                >
                  {done
                    ? <Check className="size-3" />
                    : <Icon className="size-3" />}
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden sm:block text-xs text-slate-400 font-medium">
              Step {step} of {STEPS.length}
            </span>
            {step === 6 ? (
              <Button
                type="button"
                onClick={handleSubmit as any}
                disabled={isPending || Boolean(layoutValidation) || vehicleConflict || driverConflict}
                className="h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow"
              >
                {isPending ? "Creating…" : "Create Bus"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={next}
                className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 gap-1.5"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step content ────────────────────────────────────────────── */}
      <form id="add-bus-form" onSubmit={handleSubmit}>
        <div className="w-full px-6 py-8">

          {/* Step heading */}
          <div className="mb-6 flex items-center gap-3">
            {(() => { const s = STEPS[step - 1]; const Icon = s.icon; return (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
                <Icon className="size-5 text-white" />
              </div>
            ); })()}
            <div>
              <h2 className="text-xl font-bold text-slate-900">{STEPS[step - 1].shortLabel}</h2>
              <p className="text-sm text-slate-400">{stepHint(step)}</p>
            </div>

            {/* Mobile step counter */}
            <div className="ml-auto flex lg:hidden items-center gap-1">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    s.id === step ? "w-6 bg-indigo-600" : visited.has(s.id) ? "w-2 bg-indigo-300" : "w-2 bg-slate-200"
                  )}
                />
              ))}
            </div>
          </div>

          {/* ── Step 1: Route & Schedule ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <Card>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700">Route <Req /></Label>
                  <Select value={form.routeId} onValueChange={(v) => { if (v) setForm((c) => ({ ...c, routeId: v })); }}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm">
                      <SelectValue placeholder="Select a route">
                        {routeObj ? `${routeObj.from} → ${routeObj.to}` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.from} → {r.to}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <FieldLabel label="Start Date" required />
                  <Input type="date" required value={form.date}
                    onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 mt-1.5" />
                </Card>
                <Card>
                  <FieldLabel label="End Date" note="optional — repeats daily until this date" />
                  <Input type="date" value={form.endDate}
                    onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 mt-1.5" />
                </Card>
                <Card>
                  <FieldLabel label="Departure Time" required />
                  <Input type="time" required value={form.departureTime}
                    onChange={(e) => setForm((c) => ({ ...c, departureTime: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 mt-1.5" />
                </Card>
                <Card>
                  <FieldLabel label="Arrival Time" required />
                  <Input type="time" required value={form.arrivalTime}
                    onChange={(e) => setForm((c) => ({ ...c, arrivalTime: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 mt-1.5" />
                </Card>
              </div>
            </div>
          )}

          {/* ── Step 2: Vehicle & Driver ─── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Vehicle */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <FieldLabel label="Assigned Vehicle" />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {busDetails.length - busyBusDetailIds.size}/{busDetails.length} free
                    {availabilityLoading && " · checking…"}
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
                  items={{ "": "Unassigned", ...Object.fromEntries(busDetails.map((d) => [d.id, `${d.name} · ${d.registrationNumber}`])) }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm">
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
                {vehicleConflict
                  ? <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">⚠ This vehicle is already assigned at this time.</p>
                  : busDetailsLoading ? <p className="mt-2 text-xs text-slate-400">Loading vehicles…</p>
                  : busDetailsError   ? <p className="mt-2 text-xs text-red-500">{busDetailsError}</p>
                  : <p className="mt-2 text-xs text-slate-400">Pick a saved vehicle so passengers see a consistent fleet.</p>}
              </Card>

              {/* Driver */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <FieldLabel label="Assigned Driver" note="optional" />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {drivers.length - busyDriverIds.size}/{drivers.length} free
                    {availabilityLoading && " · checking…"}
                  </span>
                </div>
                <Select
                  value={form.driverId ?? ""}
                  onValueChange={(v) => setForm((c) => ({ ...c, driverId: v || null }))}
                  items={{ "": "Unassigned", ...Object.fromEntries(drivers.map((d) => [d.id, `${d.name} · ${d.phone}`])) }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {drivers.map((d) => {
                      const busy = busyDriverIds.has(d.id);
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={busy}>
                          {d.name} · {d.phone}
                          {busy && <span className="ml-2 text-[10px] font-bold text-red-500">· Busy</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {driverConflict
                  ? <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">⚠ This driver is already assigned at this time.</p>
                  : <p className="mt-2 text-xs text-slate-400">
                    {driversLoading ? "Loading driver roster…" : drivers.length === 0 ? "Add a driver first before assigning." : "Choose the driver who will operate this departure."}
                  </p>}
                {driversError && <p className="mt-1 text-xs text-red-500">{driversError}</p>}
              </Card>
            </div>
          )}

          {/* ── Step 3: Bus Type & Pricing ─── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <FieldLabel label="Bus Type" />
                  <Select value={form.busType} onValueChange={(v) => {
                    if (!isBusType(v)) return;
                    setTemplateSaveState(null);
                    setForm((c) => ({ ...c, busType: v, seatLayout: getSeatLayoutTemplate(v) }));
                  }}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUS_TYPES.map((t) => <SelectItem key={t} value={t}>{formatBusType(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Card>
                <Card>
                  <FieldLabel label="Base Price per Seat ($)" required />
                  <Input type="number" min={1} required value={form.pricePerSeat}
                    onChange={(e) => setForm((c) => ({ ...c, pricePerSeat: e.target.value }))}
                    className="h-11 rounded-xl border-slate-200 mt-1.5" />
                </Card>
              </div>

              {/* Tier pricing */}
              <Card className="bg-blue-50/50 border-blue-100">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Seat Tier Pricing</p>
                <p className="text-xs text-slate-500 mb-4">Standard is always 1.0×. Assign tiers per seat in the layout step.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Standard", color: "slate", multiplier: "1.0", fixed: true },
                    { label: "Business", color: "blue",  key: "tierBusinessMultiplier" as const },
                    { label: "VIP",      color: "amber", key: "tierVipMultiplier"      as const },
                  ].map((tier) => (
                    <div key={tier.label} className={`rounded-xl bg-white border border-${tier.color}-200 p-3 text-center`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide text-${tier.color}-500`}>{tier.label}</p>
                      {tier.fixed ? (
                        <p className="text-xl font-bold text-slate-700 mt-1.5">1.0×</p>
                      ) : (
                        <Input type="number" step="0.05" min="1" max="5"
                          value={form[tier.key!]}
                          onChange={(e) => setForm((c) => ({ ...c, [tier.key!]: e.target.value }))}
                          className={`h-9 text-center text-lg font-bold text-${tier.color}-700 border-0 bg-transparent focus:ring-0 p-0 mt-1`} />
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ${(Number(form.pricePerSeat || 0) * (tier.fixed ? 1 : Number(form[tier.key!] || 1))).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Step 4: Amenities ─── */}
          {step === 4 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700">Select available amenities</p>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {form.amenities.length} selected
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {AMENITY_OPTIONS.map((a) => {
                  const checked = form.amenities.includes(a.value as AmenityValue);
                  return (
                    <label key={a.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all",
                        checked ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <Checkbox checked={checked}
                        onCheckedChange={(c) => setForm((cur) => ({
                          ...cur,
                          amenities: c
                            ? [...cur.amenities, a.value as AmenityValue]
                            : cur.amenities.filter((x) => x !== a.value),
                        }))}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <AmenityIcon value={a.value} className={cn("size-4 shrink-0", checked ? "text-indigo-600" : "text-slate-400")} />
                      <span className={cn("text-sm font-medium", checked ? "text-indigo-800" : "text-slate-700")}>{a.label}</span>
                      {checked && <Check className="ml-auto size-4 text-indigo-500" />}
                    </label>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Step 5: Stops ─── */}
          {step === 5 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">First stop = boarding · Last stop = drop-off. Middle stops are optional.</p>
                <Button type="button" variant="outline" className="h-8 rounded-xl text-xs font-semibold shrink-0" onClick={addStop}>
                  + Add Stop
                </Button>
              </div>
              {form.stops.length === 0 ? (
                <Card className="py-12 text-center text-slate-400 text-sm">No stops yet. Click "+ Add Stop" to begin.</Card>
              ) : (
                form.stops.map((stop, i) => (
                  <Card key={stop.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{i + 1}</span>
                    <Input value={stop.location} placeholder="Stop location"
                      onChange={(e) => updateStop(stop.id, { location: e.target.value })}
                      className="h-9 flex-1 min-w-[140px] rounded-xl border-slate-200 text-sm" />
                    <div className="flex items-center gap-2">
                      <Checkbox checked={stop.boarding}
                        onCheckedChange={(c) => updateStop(stop.id, { boarding: Boolean(c) })}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                      <span className="text-sm text-slate-600">Boarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={stop.dropping}
                        onCheckedChange={(c) => updateStop(stop.id, { dropping: Boolean(c) })}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                      <span className="text-sm text-slate-600">Drop-off</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm"
                      className="h-8 rounded-xl text-red-500 hover:bg-red-50 text-xs"
                      disabled={i === 0 || i === form.stops.length - 1}
                      onClick={() => removeStop(stop.id)}
                    >
                      Remove
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ── Step 6: Seat Layout ─── */}
          {step === 6 && (
            <div className="space-y-4">
              {/* Template save */}
              <Card className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Reusable seat template</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedBusDetail
                      ? `Saves this layout to ${selectedBusDetail.name} (${selectedBusDetail.registrationNumber}).`
                      : "Select a vehicle in step 2 to enable template saving."}
                  </p>
                </div>
                <Button type="button" variant="outline"
                  className="h-8 rounded-xl text-xs font-semibold border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                  disabled={isSavingTemplate || !form.busDetailId || Boolean(layoutValidation)}
                  onClick={saveSeatTemplate}
                >
                  {isSavingTemplate ? "Saving…" : "Save as Vehicle Template"}
                </Button>
              </Card>

              {templateSaveState && (
                <div className={cn("rounded-xl border px-4 py-2.5 text-sm font-medium",
                  templateSaveState.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                )}>
                  {templateSaveState.text}
                </div>
              )}

              <SeatLayoutEditor
                busType={form.busType}
                value={form.seatLayout}
                bookedSeats={[]}
                blockedSeats={form.blockedSeats}
                onChange={(sl) => setForm((c) => ({ ...c, seatLayout: sl }))}
                onBlockedSeatsChange={(bs) => setForm((c) => ({ ...c, blockedSeats: bs }))}
              />
            </div>
          )}

          {/* ── Error banner ─── */}
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              ⚠️ {error}
            </p>
          )}

          {/* ── Bottom nav ─── */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => router.back() : prev}
              className="h-10 rounded-xl border-slate-300 text-slate-700 gap-1.5"
            >
              <ArrowLeft className="size-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-2">
              {/* Dot indicators */}
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    s.id === step ? "w-6 h-2.5 bg-indigo-600" : visited.has(s.id) ? "w-2.5 h-2.5 bg-indigo-300" : "w-2.5 h-2.5 bg-slate-200"
                  )}
                />
              ))}
            </div>

            {step < 6 ? (
              <Button type="button" onClick={next}
                className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 gap-1.5"
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending || Boolean(layoutValidation) || vehicleConflict || driverConflict}
                className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-6 shadow gap-1.5"
              >
                <Check className="size-4" />
                {isPending ? "Creating…" : "Create Bus"}
              </Button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function FieldLabel({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <Label className="text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {note && <span className="ml-1.5 text-xs font-normal text-slate-400">({note})</span>}
    </Label>
  );
}

function Req() { return <span className="text-red-500">*</span>; }

function stepHint(s: number) {
  return [
    "Where is this bus going and when?",
    "Which vehicle and driver will operate this departure?",
    "Set the bus type and ticket pricing.",
    "What facilities are available on board?",
    "Define boarding and drop-off points.",
    "Arrange the seat map and block seats if needed.",
  ][s - 1];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getLayoutValidation(layout: ReturnType<typeof getSeatLayoutTemplate>) {
  try { validateSeatLayout(layout, []); return ""; }
  catch (e) { return e instanceof Error ? e.message : "Seat layout is invalid."; }
}

function defaultForm(routes: RouteSummary[]): FormState {
  const t: BusType = "mini_bus";
  const route = routes[0];
  return {
    routeId: routes[0]?.id ?? "", date: "", endDate: "",
    departureTime: "08:00", arrivalTime: "14:00",
    busType: t, pricePerSeat: "18",
    seatLayout: getSeatLayoutTemplate(t),
    amenities: [], blockedSeats: [],
    stops: route ? defaultStops(route) : [],
    driverId: null, busDetailId: null,
    tierBusinessMultiplier: "1.3", tierVipMultiplier: "1.6",
  };
}

function defaultStops(r: RouteSummary): StopEntry[] {
  return [
    { id: `s-${r.id}-from`, location: r.from, boarding: true,  dropping: false, order: 0 },
    { id: `s-${r.id}-to`,   location: r.to,   boarding: false, dropping: true,  order: 1 },
  ];
}

function mkStop(location = "", boarding = true, dropping = true): StopEntry {
  return { id: `stop-${Math.random().toString(16).slice(2)}`, location, boarding, dropping, order: 0 };
}

function reindex(stops: StopEntry[]): StopEntry[] {
  return stops.map((s, i) => ({ ...s, order: i }));
}
