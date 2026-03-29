"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SeatLayoutEditor from "@/components/seat-layout-editor";
import { Button } from "@/components/ui/button";
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
import { BUS_TYPES } from "@/lib/constants";
import { formatBusType } from "@/lib/formatters";
import type { BusSummary, RouteSummary } from "@/lib/queries";
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
          <div className="grid gap-4 xl:grid-cols-5">
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

          {/* Seat Layout Editor */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Seat Layout</Label>
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-red-50/50 p-6">
              <SeatLayoutEditor
                busType={form.busType}
                value={form.seatLayout}
                bookedSeats={bus?.bookedSeats ?? []}
                onChange={(seatLayout) =>
                  setForm((current) => ({
                    ...current,
                    seatLayout,
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
    return {
      routeId: bus.routeId,
      date: bus.travelDate,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      busType: bus.busType,
      pricePerSeat: String(bus.pricePerSeat),
      seatLayout: cloneSeatLayout(bus.seatLayout),
    };
  }

  const initialType: BusType = "mini_bus";

  return {
    routeId: routes[0]?.id ?? "",
    date: "",
    departureTime: "08:00",
    arrivalTime: "14:00",
    busType: initialType,
    pricePerSeat: "18",
    seatLayout: getSeatLayoutTemplate(initialType),
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
