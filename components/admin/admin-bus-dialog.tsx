"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SeatLayoutEditor from "@/components/booking/seat-layout-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { BusDetailSummary, BusSummary, DriverSummary, RouteSummary } from "@/lib/db/queries";
import { type BusStop } from "@/types/bus";
import {
  type BusType,
  cloneSeatLayout,
  getSeatLayoutTemplate,
  isBusType,
  validateSeatLayout,
} from "@/lib/seat/seat-layout";

type AdminBusDialogProps = {
  open: boolean;
  routes: RouteSummary[];
  bus?: BusSummary | null;
  onOpenChange: (open: boolean) => void;
};

type BusFormState = {
    routeId: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    busType: BusType;
    pricePerSeat: string;
    seatLayout: BusSummary["seatLayout"];
    amenities: AmenityValue[];
    blockedSeats: string[];
    stops: StopEntry[];
    driverId: string | null;
    busDetailId: string | null;
    endDate: string;
    tierBusinessMultiplier: string;
    tierVipMultiplier: string;
  };

type StopEntry = BusStop & {
  id: string;
};

export default function AdminBusDialog({
  open,
  routes,
  bus,
  onOpenChange,
}: AdminBusDialogProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState("");
  const [busDetails, setBusDetails] = useState<BusDetailSummary[]>([]);
  const [busDetailsLoading, setBusDetailsLoading] = useState(false);
  const [busDetailsError, setBusDetailsError] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveState, setTemplateSaveState] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [form, setForm] = useState<BusFormState>(() => createFormState(routes, bus));
  const [busyBusDetailIds, setBusyBusDetailIds] = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds] = useState<Set<string>>(new Set());
  const [conflictInfo, setConflictInfo] = useState<Record<string, string>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createFormState(routes, bus));
    setError("");
    setIsPending(false);
    setIsSavingTemplate(false);
    setTemplateSaveState(null);
    setBusyBusDetailIds(new Set());
    setBusyDriverIds(new Set());
    setConflictInfo({});
  }, [bus, open, routes]);

  useEffect(() => {
    let mounted = true;
    setDriversLoading(true);
    setDriversError("");

    fetch("/api/admin/drivers")
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Unable to load drivers.");
        }
        return response.json();
      })
      .then((payload) => {
        if (mounted) {
          setDrivers(payload?.drivers ?? []);
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setDriversError(
            typeof fetchError === "string"
              ? fetchError
              : fetchError instanceof Error
              ? fetchError.message
              : "Unable to load drivers."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setDriversLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setBusDetailsLoading(true);
    setBusDetailsError("");

    fetch("/api/admin/bus-details")
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Unable to load bus details.");
        }

        return response.json();
      })
      .then((payload) => {
        if (mounted) {
          setBusDetails(payload?.busDetails ?? []);
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setBusDetailsError(
            typeof fetchError === "string"
              ? fetchError
              : fetchError instanceof Error
              ? fetchError.message
              : "Unable to load bus details."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setBusDetailsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch availability whenever date/time changes
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
    if (form.endDate && form.endDate >= form.date) {
      params.set("endDate", form.endDate);
    }
    if (bus?.id) {
      params.set("excludeId", bus.id);
    }

    fetch(`/api/admin/buses/availability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { busyBusDetailIds: [], busyDriverIds: [], conflictInfo: {} }))
      .then((data) => {
        if (mounted) {
          setBusyBusDetailIds(new Set(data.busyBusDetailIds ?? []));
          setBusyDriverIds(new Set(data.busyDriverIds ?? []));
          setConflictInfo(data.conflictInfo ?? {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setAvailabilityLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [form.date, form.endDate, form.departureTime, form.arrivalTime, bus?.id]);

  const layoutValidation = getLayoutValidation(form.seatLayout, bus?.bookedSeats ?? []);
  const isEditing = Boolean(bus);

  // In edit mode, only flag a conflict when the user has actually changed the
  // vehicle/driver or the time window — not on initial open (the existing
  // assignment was already valid when the bus was created).
  const timeChanged = isEditing && (
    form.date !== bus?.travelDate ||
    form.departureTime !== bus?.departureTime ||
    form.arrivalTime !== bus?.arrivalTime
  );
  const vehicleConflict = Boolean(form.busDetailId) && busyBusDetailIds.has(form.busDetailId!) &&
    (!isEditing || timeChanged || form.busDetailId !== (bus?.busDetail?.id ?? null));
  const driverConflict = Boolean(form.driverId) && busyDriverIds.has(form.driverId!) &&
    (!isEditing || timeChanged || form.driverId !== (bus?.driver?.id ?? null));
  const hasConflict = vehicleConflict || driverConflict;
  const selectedBusDetail =
    busDetails.find((detail) => detail.id === form.busDetailId) ?? null;

  function addStop() {
    setForm((current) => {
      if (current.stops.length === 0) {
        return {
          ...current,
          stops: reindexStops([createStopEntry(), createStopEntry("", false, true)]),
        };
      }

      const updatedStops = [
        ...current.stops.slice(0, current.stops.length - 1),
        createStopEntry(),
        current.stops[current.stops.length - 1],
      ];

      return {
        ...current,
        stops: reindexStops(updatedStops),
      };
    });
  }

  function removeStop(stopId: string) {
    setForm((current) => ({
      ...current,
      stops: reindexStops(current.stops.filter((stop) => stop.id !== stopId)),
    }));
  }

  function updateStop(stopId: string, updates: Partial<StopEntry>) {
    setForm((current) => ({
      ...current,
      stops: reindexStops(
        current.stops.map((stop) =>
          stop.id === stopId
            ? {
                ...stop,
                ...updates,
              }
            : stop
        )
      ),
    }));
  }

  async function saveSeatTemplate() {
    if (!form.busDetailId) {
      setTemplateSaveState({
        type: "error",
        text: "Select a vehicle above before saving a reusable seat template.",
      });
      return;
    }

    if (layoutValidation) {
      setTemplateSaveState({
        type: "error",
        text: layoutValidation,
      });
      return;
    }

    setIsSavingTemplate(true);
    setTemplateSaveState(null);

    try {
      const response = await fetch(`/api/admin/bus-details/${form.busDetailId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busType: form.busType,
          seatLayoutTemplate: form.seatLayout,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        busDetail?: BusDetailSummary;
      };

      if (!response.ok || !payload.busDetail) {
        setTemplateSaveState({
          type: "error",
          text: payload.message ?? "Unable to save the seat template right now.",
        });
        return;
      }

      setBusDetails((current) =>
        current.map((detail) =>
          detail.id === payload.busDetail?.id ? payload.busDetail : detail
        )
      );
      setTemplateSaveState({
        type: "success",
        text:
          payload.message ??
          "Seat template saved. Future departures can reuse this layout.",
      });
      router.refresh();
    } catch {
      setTemplateSaveState({
        type: "error",
        text: "Unable to save the seat template right now.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function submitBus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (layoutValidation) {
      setError(layoutValidation);
      return;
    }

    setIsPending(true);
    setError("");

    try {
      const endpoint = isEditing ? `/api/admin/buses/${bus!.id}` : "/api/admin/buses";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
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
            stops: form.stops.map((stop) => ({
              location: stop.location,
              boarding: stop.boarding,
              dropping: stop.dropping,
            })),
            driverId: form.driverId || null,
            busDetailId: form.busDetailId || null,
            seatTierMultipliers: {
              business: Number(form.tierBusinessMultiplier) || 1.3,
              vip:      Number(form.tierVipMultiplier)      || 1.6,
            },
          }),
        });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Unable to save the bus.");
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Unable to save the bus right now.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl bg-white shadow-2xl border border-slate-200 p-0 gap-0">

        {/* ── Header ── */}
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
              <svg className="size-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {isEditing ? "Edit Bus Departure" : "Add New Bus"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-0.5">
                Configure route, timing, vehicle, and seat layout for this departure
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submitBus} className="px-6 py-6 space-y-6">

          {/* ── Section 1: Route & Schedule ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Route & Schedule</p>
            </div>
            <div className="p-4 grid gap-4 xl:grid-cols-6">
              <div className="space-y-1.5 xl:col-span-2">
                <Label htmlFor="bus-route" className="text-sm font-semibold text-slate-700">Route <span className="text-red-500">*</span></Label>
                <Select
                  value={form.routeId}
                  onValueChange={(value) => {
                    if (!value) return;
                    setForm((current) => ({ ...current, routeId: value }));
                  }}
                >
                  <SelectTrigger id="bus-route" className="h-10 w-full rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20">
                    <SelectValue placeholder="Select a route">
                      {(() => {
                        const r = routes.find((route) => route.id === form.routeId);
                        return r ? `${r.from} → ${r.to}` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.from} → {route.to}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-date" className="text-sm font-semibold text-slate-700">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  id="bus-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-end-date" className="text-sm font-semibold text-slate-700">
                  End Date <span className="text-xs font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="bus-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
                <p className="text-[11px] text-slate-400 leading-snug">Repeats daily until this date. Leave empty for a single departure.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-departure" className="text-sm font-semibold text-slate-700">Departure <span className="text-red-500">*</span></Label>
                <Input
                  id="bus-departure"
                  type="time"
                  value={form.departureTime}
                  onChange={(event) => setForm((current) => ({ ...current, departureTime: event.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bus-arrival" className="text-sm font-semibold text-slate-700">Arrival <span className="text-red-500">*</span></Label>
                <Input
                  id="bus-arrival"
                  type="time"
                  value={form.arrivalTime}
                  onChange={(event) => setForm((current) => ({ ...current, arrivalTime: event.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  required
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Vehicle & Driver ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle & Driver Assignment</p>
            </div>
            <div className="p-4 grid gap-5 md:grid-cols-2">

              {/* Bus Detail */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Assigned Vehicle</Label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {busDetails.length - busyBusDetailIds.size}/{busDetails.length} free
                    {availabilityLoading && <span className="text-slate-400"> · checking…</span>}
                  </span>
                </div>
                <Select
                  value={form.busDetailId}
                  onValueChange={(value) => {
                    const selectedDetail = busDetails.find((detail) => detail.id === value);
                    setTemplateSaveState(null);
                    setForm((current) => {
                      if (!selectedDetail) return { ...current, busDetailId: value };
                      const template = selectedDetail.seatLayoutTemplate ?? getSeatLayoutTemplate(selectedDetail.busType);
                      return { ...current, busDetailId: value, busType: selectedDetail.busType, seatLayout: structuredClone(template) };
                    });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20">
                    <SelectValue placeholder="Select a vehicle or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {busDetails.map((detail) => {
                      const isBusy = busyBusDetailIds.has(detail.id);
                      return (
                        <SelectItem key={detail.id} value={detail.id} disabled={isBusy}>
                          {detail.name} · {detail.registrationNumber}
                          {isBusy && <span className="ml-2 text-[10px] font-bold text-red-500">· Busy{conflictInfo[detail.id] ? ` ${conflictInfo[detail.id]}` : ""}</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {vehicleConflict ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                    ⚠ This vehicle is already assigned at this time. Change the time or pick a different vehicle.
                  </p>
                ) : busDetailsLoading ? (
                  <p className="text-[11px] text-slate-400">Loading vehicles…</p>
                ) : busDetailsError ? (
                  <p className="text-[11px] text-red-600">{busDetailsError}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">Pick a saved vehicle so passengers see a consistent fleet.</p>
                )}
                {busyBusDetailIds.size > 0 && !busyBusDetailIds.has(form.busDetailId ?? "") && (
                  <p className="text-[11px] font-medium text-amber-600">
                    {busyBusDetailIds.size} vehicle{busyBusDetailIds.size !== 1 ? "s are" : " is"} unavailable at this time slot
                  </p>
                )}
              </div>

              {/* Driver */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bus-driver" className="text-sm font-semibold text-slate-700">
                    Assigned Driver <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </Label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {drivers.length - busyDriverIds.size}/{drivers.length} free
                    {availabilityLoading && <span className="text-slate-400"> · checking…</span>}
                  </span>
                </div>
                <Select
                  value={form.driverId}
                  onValueChange={(value) => setForm((current) => ({ ...current, driverId: value }))}
                >
                  <SelectTrigger id="bus-driver" className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {drivers.map((driver) => {
                      const isBusy = busyDriverIds.has(driver.id);
                      return (
                        <SelectItem key={driver.id} value={driver.id} disabled={isBusy}>
                          {driver.name} · {driver.phone}
                          {isBusy && <span className="ml-2 text-[10px] font-bold text-red-500">· Busy{conflictInfo[driver.id] ? ` ${conflictInfo[driver.id]}` : ""}</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {driverConflict ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                    ⚠ This driver is already assigned at this time. Change the time or pick a different driver.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {driversLoading ? "Loading driver roster…" : drivers.length === 0 ? "Add a driver first before assigning." : "Choose the driver who will operate this departure."}
                  </p>
                )}
                {driversError && <p className="text-[11px] text-red-600">{driversError}</p>}
                {busyDriverIds.size > 0 && !busyDriverIds.has(form.driverId ?? "") && (
                  <p className="text-[11px] font-medium text-amber-600">
                    {busyDriverIds.size} driver{busyDriverIds.size !== 1 ? "s are" : " is"} unavailable at this time slot
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Bus Type & Price ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bus Type & Pricing</p>
            </div>
            <div className="p-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bus-type" className="text-sm font-semibold text-slate-700">Bus Type</Label>
                <Select
                  value={form.busType}
                  onValueChange={(value) => {
                    if (!isBusType(value)) return;
                    setTemplateSaveState(null);
                    setForm((current) => ({ ...current, busType: value, seatLayout: getSeatLayoutTemplate(value) }));
                  }}
                >
                  <SelectTrigger id="bus-type" className="h-10 w-full rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20">
                    <SelectValue placeholder="Choose bus type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUS_TYPES.map((busType) => (
                      <SelectItem key={busType} value={busType}>{formatBusType(busType)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bus-price" className="text-sm font-semibold text-slate-700">Base Price per Seat ($) <span className="text-red-500">*</span></Label>
                <Input
                  id="bus-price"
                  type="number"
                  min={1}
                  value={form.pricePerSeat}
                  onChange={(event) => setForm((current) => ({ ...current, pricePerSeat: event.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  required
                />
              </div>
            </div>

            {/* Tier pricing */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Seat Tier Pricing</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set multipliers per tier — Standard is always 1.0×. Assign tiers per seat in the layout editor below.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Standard</p>
                  <p className="text-base font-bold text-slate-700 mt-1">1.0×</p>
                  <p className="text-[10px] text-slate-400">${Number(form.pricePerSeat || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-white border border-blue-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Business</p>
                  <Input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    value={form.tierBusinessMultiplier}
                    onChange={(e) => setForm((c) => ({ ...c, tierBusinessMultiplier: e.target.value }))}
                    className="h-8 text-center text-base font-bold text-blue-700 border-0 bg-transparent focus:ring-0 p-0 mt-1"
                  />
                  <p className="text-[10px] text-slate-400">${(Number(form.pricePerSeat || 0) * Number(form.tierBusinessMultiplier || 1.3)).toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-white border border-amber-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">VIP</p>
                  <Input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    value={form.tierVipMultiplier}
                    onChange={(e) => setForm((c) => ({ ...c, tierVipMultiplier: e.target.value }))}
                    className="h-8 text-center text-base font-bold text-amber-700 border-0 bg-transparent focus:ring-0 p-0 mt-1"
                  />
                  <p className="text-[10px] text-slate-400">${(Number(form.pricePerSeat || 0) * Number(form.tierVipMultiplier || 1.6)).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Amenities ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bus Amenities</p>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {form.amenities.length} selected
              </span>
            </div>
            <div className="p-4">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {AMENITY_OPTIONS.map((amenity) => {
                  const checked = form.amenities.includes(amenity.value as AmenityValue);
                  return (
                    <label
                      key={amenity.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        checked
                          ? "border-indigo-300 bg-indigo-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Checkbox
                        id={`amenity-${amenity.value}`}
                        checked={checked}
                        onCheckedChange={(c) => {
                          setForm((current) => ({
                            ...current,
                            amenities: c
                              ? [...current.amenities, amenity.value as AmenityValue]
                              : current.amenities.filter((a) => a !== amenity.value),
                          }));
                        }}
                        className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className={`flex items-center gap-2 text-sm font-medium ${checked ? "text-indigo-800" : "text-slate-700"}`}>
                        <AmenityIcon value={amenity.value} className="size-4 shrink-0" />
                        {amenity.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 5: Stops ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Boarding & Drop-off Stops</p>
                <p className="text-[11px] text-slate-400 mt-0.5">First stop = main boarding point · Last stop = final drop-off</p>
              </div>
              <Button type="button" variant="outline" className="h-8 rounded-xl text-xs font-semibold" onClick={addStop}>
                + Add Stop
              </Button>
            </div>
            <div className="p-4 space-y-2.5">
              {form.stops.map((stop, index) => (
                <div key={stop.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <Input
                    value={stop.location}
                    onChange={(event) => updateStop(stop.id, { location: event.target.value })}
                    placeholder="Stop location"
                    className="h-9 rounded-xl border-slate-200 bg-white text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={stop.boarding}
                      onCheckedChange={(checked) => updateStop(stop.id, { boarding: Boolean(checked) })}
                      className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Boarding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={stop.dropping}
                      onCheckedChange={(checked) => updateStop(stop.id, { dropping: Boolean(checked) })}
                      className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Drop-off</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold"
                    onClick={() => removeStop(stop.id)}
                    disabled={index === 0 || index === form.stops.length - 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 6: Seat Layout ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Seat Layout & Blocking</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedBusDetail
                    ? `Saving updates the reusable layout for ${selectedBusDetail.name} (${selectedBusDetail.registrationNumber}).`
                    : "Select a vehicle above to save this as a reusable template."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-red-200 border border-red-400" />
                  <span className="text-xs text-slate-500">Blocked</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-semibold border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                  disabled={isSavingTemplate || !form.busDetailId || Boolean(layoutValidation)}
                  onClick={saveSeatTemplate}
                >
                  {isSavingTemplate ? "Saving…" : "Save as Vehicle Template"}
                </Button>
              </div>
            </div>
            <div className="p-4 bg-slate-50/30">
              <SeatLayoutEditor
                busType={form.busType}
                value={form.seatLayout}
                bookedSeats={bus?.bookedSeats ?? []}
                blockedSeats={form.blockedSeats}
                onChange={(seatLayout) => setForm((current) => ({ ...current, seatLayout }))}
                onBlockedSeatsChange={(blockedSeats) => setForm((current) => ({ ...current, blockedSeats }))}
              />
            </div>
            {templateSaveState && (
              <div className={`mx-4 mb-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                templateSaveState.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {templateSaveState.text}
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              ⚠️ {error}
            </p>
          )}

          {/* ── Footer ── */}
          <DialogFooter className="gap-3 pt-2 pb-1">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-6 shadow-md shadow-indigo-100"
              disabled={isPending || Boolean(layoutValidation) || (!isEditing && hasConflict)}
            >
              {isPending
                ? isEditing ? "Saving…" : "Creating…"
                : isEditing ? "Save Changes" : "Create Bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function createFormState(routes: RouteSummary[], bus?: BusSummary | null): BusFormState {
  if (bus) {
    return {
      routeId: bus.routeId,
      date: bus.travelDate,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      busType: bus.busType,
      pricePerSeat: String(bus.pricePerSeat),
      seatLayout: cloneSeatLayout(bus.seatLayout),
      amenities: (bus.amenities ?? []) as AmenityValue[],
      blockedSeats: bus.blockedSeats ?? [],
      stops: mapBusStops(bus.stops),
      endDate: bus.travelDate,
        driverId: bus.driver?.id ?? null,
        busDetailId: bus.busDetail?.id ?? null,
        tierBusinessMultiplier: String(bus.seatTierMultipliers?.business ?? 1.3),
        tierVipMultiplier:      String(bus.seatTierMultipliers?.vip      ?? 1.6),
    };
  }

  const initialType: BusType = "mini_bus";
  const defaultRoute = routes[0];

  return {
    routeId: routes[0]?.id ?? "",
    date: "",
    departureTime: "08:00",
    arrivalTime: "14:00",
    busType: initialType,
    pricePerSeat: "18",
    seatLayout: getSeatLayoutTemplate(initialType),
    amenities: [],
    blockedSeats: [],
    stops: getDefaultStopEntries(defaultRoute),
    endDate: "",
      driverId: null,
      busDetailId: null,
      tierBusinessMultiplier: "1.3",
      tierVipMultiplier:      "1.6",
  };
}

function getLayoutValidation(layout: BusSummary["seatLayout"], bookedSeats: string[]) {
  try {
    validateSeatLayout(layout, bookedSeats);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Seat layout is invalid.";
  }
}

function mapBusStops(stops?: BusSummary["stops"]) {
  if (!stops || stops.length === 0) {
    return [];
  }

  return stops.map((stop, index) => ({
    id: `${stop.location}-${index}-${Math.random().toString(16).slice(2)}`,
    location: stop.location,
    boarding: stop.boarding,
    dropping: stop.dropping,
    order: index,
  }));
}

function getDefaultStopEntries(route?: RouteSummary | null) {
  if (!route) {
    return [];
  }

  return [
    {
      id: `start-${route.id}`,
      location: route.from,
      boarding: true,
      dropping: false,
      order: 0,
    },
    {
      id: `end-${route.id}`,
      location: route.to,
      boarding: false,
      dropping: true,
      order: 1,
    },
  ];
}

function createStopEntry(location = "", boarding = true, dropping = true): StopEntry {
  return {
    id: `stop-${location}-${Math.random().toString(16).slice(2)}`,
    location,
    boarding,
    dropping,
    order: 0,
  };
}

function reindexStops(stops: StopEntry[]) {
  return stops.map((stop, index) => ({ ...stop, order: index }));
}
