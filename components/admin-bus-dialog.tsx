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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit bus departure" : "Add a new bus"}</DialogTitle>
          <DialogDescription>
            Choose a bus type, fine-tune the seat map, and publish the departure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submitBus} className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="bus-route">Route</Label>
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
                <SelectTrigger id="bus-route" className="h-11 w-full rounded-2xl">
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
              <Label htmlFor="bus-date">Date</Label>
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
                className="h-11 rounded-2xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-departure">Departure</Label>
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
                className="h-11 rounded-2xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus-arrival">Arrival</Label>
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
                className="h-11 rounded-2xl"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bus-type">Bus type</Label>
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
                <SelectTrigger id="bus-type" className="h-11 w-full rounded-2xl">
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
              <Label htmlFor="bus-price">Price per seat</Label>
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
                className="h-11 rounded-2xl"
                required
              />
            </div>
          </div>

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

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <DialogFooter className="rounded-b-none border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-2xl"
              disabled={isPending || Boolean(layoutValidation)}
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save changes"
                  : "Create bus"}
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
