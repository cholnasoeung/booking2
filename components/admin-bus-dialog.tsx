"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SeatLayoutEditor from "@/components/seat-layout-editor";
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
import { AMENITY_OPTIONS, BUS_TYPES, type AmenityValue } from "@/lib/constants";
import { formatBusType } from "@/lib/formatters";
import type { BusSummary, RouteSummary } from "@/lib/queries";
import { type BusStop } from "@/types/bus";
import {
  type BusType,
  cloneSeatLayout,
  getSeatLayoutTemplate,
  isBusType,
  validateSeatLayout,
} from "@/lib/seat-layout";

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
  endDate: string;
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
  const [form, setForm] = useState<BusFormState>(() => createFormState(routes, bus));

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createFormState(routes, bus));
    setError("");
    setIsPending(false);
  }, [bus, open, routes]);

  const layoutValidation = getLayoutValidation(form.seatLayout, bus?.bookedSeats ?? []);
  const isEditing = Boolean(bus);

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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl border-2 border-orange-200/60 bg-gradient-to-br from-white to-orange-50/50 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b-2 border-dashed border-orange-200/60 pb-4 bg-gradient-to-r from-orange-50 to-red-50 -mx-6 px-6 -mt-6 pt-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-2xl">{isEditing ? "Edit Bus Departure" : "Add New Bus"}</DialogTitle>
              <DialogDescription className="text-sm">
                Choose a bus type, fine-tune the seat map, and publish the departure
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submitBus} className="space-y-5 pt-4">
          {/* Route and Date/Time Grid */}
          <div className="grid gap-4 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="bus-route" className="text-sm font-semibold">Route</Label>
              <Select
                value={form.routeId}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    routeId: value,
                  }));
                }}
              >
                <SelectTrigger id="bus-route" className="h-11 w-full rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.from} to {route.to}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-date" className="text-sm font-semibold">Date</Label>
              <Input
                id="bus-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-end-date" className="text-sm font-semibold">
                End date
              </Label>
              <Input
                id="bus-end-date"
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
              <p className="text-xs text-muted-foreground">
                Set an end date to publish this departure every day until that date.
                Leave empty for a single departure.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-departure" className="text-sm font-semibold">Departure</Label>
              <Input
                id="bus-departure"
                type="time"
                value={form.departureTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    departureTime: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-arrival" className="text-sm font-semibold">Arrival</Label>
              <Input
                id="bus-arrival"
                type="time"
                value={form.arrivalTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    arrivalTime: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                required
              />
            </div>
          </div>

          {/* Bus Type and Price */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bus-type" className="text-sm font-semibold">Bus Type</Label>
              <Select
                value={form.busType}
                onValueChange={(value) => {
                  if (!isBusType(value)) {
                    return;
                  }

                  const nextType = value;
                  setForm((current) => ({
                    ...current,
                    busType: nextType,
                    seatLayout: getSeatLayoutTemplate(nextType),
                  }));
                }}
              >
                <SelectTrigger id="bus-type" className="h-11 w-full rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20">
                  <SelectValue placeholder="Choose bus type" />
                </SelectTrigger>
                <SelectContent>
                  {BUS_TYPES.map((busType) => (
                    <SelectItem key={busType} value={busType}>
                      {formatBusType(busType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-price" className="text-sm font-semibold">Price per Seat</Label>
              <Input
                id="bus-price"
                type="number"
                min={1}
                value={form.pricePerSeat}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pricePerSeat: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border-orange-200/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                required
              />
            </div>
          </div>

          {/* Amenities Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Bus Amenities</Label>
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-red-50/50 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {AMENITY_OPTIONS.map((amenity) => (
                  <div
                    key={amenity.value}
                    className="flex items-start space-x-3 rounded-xl border border-orange-200/60 bg-white/80 p-3 hover:bg-white/100 transition-colors"
                  >
                    <Checkbox
                      id={`amenity-${amenity.value}`}
                      checked={form.amenities.includes(amenity.value as AmenityValue)}
                      onCheckedChange={(checked) => {
                        setForm((current) => ({
                          ...current,
                          amenities: checked
                            ? [...current.amenities, amenity.value as AmenityValue]
                            : current.amenities.filter((a) => a !== amenity.value),
                        }));
                      }}
                      className="mt-0.5 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`amenity-${amenity.value}`}
                        className="cursor-pointer text-sm font-medium text-foreground"
                      >
                        <span className="mr-1.5">{amenity.icon}</span>
                        {amenity.label}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground text-center">
                {form.amenities.length} amen{form.amenities.length === 1 ? 'y' : 'ies'} selected
              </p>
            </div>
          </div>

          {/* Stops Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Boarding & Drop-off stops</Label>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={addStop}
              >
                Add stop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep the first stop as the main boarding point and the last as the final drop-off.
            </p>
            <div className="space-y-3">
              {form.stops.map((stop, index) => (
                <div
                  key={stop.id}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-orange-200/60 bg-white/80 p-3 md:grid-cols-[1fr_auto_auto_auto]"
                >
                  <Input
                    value={stop.location}
                    onChange={(event) =>
                      updateStop(stop.id, { location: event.target.value })
                    }
                    placeholder="Stop location"
                    className="h-11 rounded-2xl"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={stop.boarding}
                      onCheckedChange={(checked) =>
                        updateStop(stop.id, { boarding: Boolean(checked) })
                      }
                      className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <span className="text-sm font-medium text-foreground">Boarding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={stop.dropping}
                      onCheckedChange={(checked) =>
                        updateStop(stop.id, { dropping: Boolean(checked) })
                      }
                      className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <span className="text-sm font-medium text-foreground">Drop-off</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 rounded-2xl text-red-600 hover:bg-red-50"
                    onClick={() => removeStop(stop.id)}
                    disabled={index === 0 || index === form.stops.length - 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Seat Layout Editor with Blocking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Seat Layout & Blocking</Label>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-red-200 border border-red-400" />
                  <span className="text-muted-foreground">Blocked</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-red-50/50 p-6">
              <SeatLayoutEditor
                busType={form.busType}
                value={form.seatLayout}
                bookedSeats={bus?.bookedSeats ?? []}
                blockedSeats={form.blockedSeats}
                onChange={(seatLayout) =>
                  setForm((current) => ({
                    ...current,
                    seatLayout,
                  }))
                }
                onBlockedSeatsChange={(blockedSeats) =>
                  setForm((current) => ({
                    ...current,
                    blockedSeats,
                  }))
                }
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border-2 border-red-200/60 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              ⚠️ {error}
            </p>
          ) : null}

          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-2 border-orange-200/60 hover:bg-orange-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 shadow-lg hover:shadow-xl transition-all"
              disabled={isPending || Boolean(layoutValidation)}
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Bus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function createFormState(routes: RouteSummary[], bus?: BusSummary | null): BusFormState {
  if (bus) {
    const route = routes.find((current) => current.id === bus.routeId) ?? routes[0];
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
