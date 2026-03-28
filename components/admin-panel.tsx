"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, MapPinned, Plus, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatSeatList, formatTravelDate } from "@/lib/formatters";
import type { AdminBookingSummary, BusSummary, RouteSummary } from "@/lib/queries";

type AdminPanelProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  bookings: AdminBookingSummary[];
};

const emptyRouteForm = {
  from: "",
  to: "",
  duration: "",
  distance: "",
};

export default function AdminPanel({
  routes,
  buses,
  bookings,
}: AdminPanelProps) {
  const router = useRouter();
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [busDialogOpen, setBusDialogOpen] = useState(false);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [busForm, setBusForm] = useState({
    routeId: routes[0]?.id ?? "",
    date: "",
    departureTime: "08:00",
    arrivalTime: "14:00",
    totalSeats: "40",
    pricePerSeat: "18",
  });
  const [routePending, setRoutePending] = useState(false);
  const [busPending, setBusPending] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [busError, setBusError] = useState("");

  async function submitRoute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoutePending(true);
    setRouteError("");

    try {
      const response = await fetch("/api/admin/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...routeForm,
          distance: Number(routeForm.distance),
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setRouteError(payload.message || "Unable to create the route.");
        return;
      }

      setRouteDialogOpen(false);
      setRouteForm(emptyRouteForm);
      router.refresh();
    } catch {
      setRouteError("Unable to create the route right now.");
    } finally {
      setRoutePending(false);
    }
  }

  async function submitBus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusPending(true);
    setBusError("");

    try {
      const response = await fetch("/api/admin/buses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          routeId: busForm.routeId,
          date: busForm.date,
          departureTime: busForm.departureTime,
          arrivalTime: busForm.arrivalTime,
          totalSeats: Number(busForm.totalSeats),
          pricePerSeat: Number(busForm.pricePerSeat),
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setBusError(payload.message || "Unable to create the bus.");
        return;
      }

      setBusDialogOpen(false);
      setBusForm({
        routeId: routes[0]?.id ?? "",
        date: "",
        departureTime: "08:00",
        arrivalTime: "14:00",
        totalSeats: "40",
        pricePerSeat: "18",
      });
      router.refresh();
    } catch {
      setBusError("Unable to create the bus right now.");
    } finally {
      setBusPending(false);
    }
  }

  return (
    <>
      <Tabs defaultValue="routes" className="gap-5">
        <TabsList className="bg-white/80 p-1">
          <TabsTrigger value="routes">
            <MapPinned className="size-4" />
            Manage Routes
          </TabsTrigger>
          <TabsTrigger value="buses">
            <BusFront className="size-4" />
            Manage Buses
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Ticket className="size-4" />
            View All Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
          <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Route directory</CardTitle>
                <CardDescription>
                  Keep your city pairs, durations, and distance estimates current.
                </CardDescription>
              </div>
              <Button type="button" size="lg" className="rounded-full" onClick={() => setRouteDialogOpen(true)}>
                <Plus className="size-4" />
                Add route
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>{route.from}</TableCell>
                      <TableCell>{route.to}</TableCell>
                      <TableCell>{route.duration}</TableCell>
                      <TableCell>{route.distance} km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buses">
          <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Bus departures</CardTitle>
                <CardDescription>
                  Publish new schedules and monitor how many seats remain open.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-full"
                disabled={routes.length === 0}
                onClick={() => setBusDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add bus
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Fare</TableHead>
                    <TableHead>Seats left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buses.map((bus) => (
                    <TableRow key={bus.id}>
                      <TableCell>{`${bus.from} to ${bus.to}`}</TableCell>
                      <TableCell>{formatTravelDate(bus.travelDate)}</TableCell>
                      <TableCell>{`${bus.departureTime} to ${bus.arrivalTime}`}</TableCell>
                      <TableCell>{formatCurrency(bus.pricePerSeat)}</TableCell>
                      <TableCell>
                        <Badge variant={bus.seatsLeft === 0 ? "outline" : "secondary"}>
                          {bus.seatsLeft} left
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
            <CardHeader>
              <CardTitle>Customer bookings</CardTitle>
              <CardDescription>
                Track confirmed tickets, cancellations, and route demand in one table.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {booking.user?.name || "Unknown traveller"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.user?.email || "No email"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.bus
                          ? `${booking.bus.from} to ${booking.bus.to}`
                          : "Unavailable"}
                      </TableCell>
                      <TableCell>{formatSeatList(booking.seats)}</TableCell>
                      <TableCell>{formatCurrency(booking.totalPrice)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={booking.status === "confirmed" ? "secondary" : "outline"}
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTravelDate(booking.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a new route</DialogTitle>
            <DialogDescription>
              Create the city pair first so admins can attach departures to it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRoute} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-from">From</Label>
                <Input
                  id="route-from"
                  value={routeForm.from}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, from: event.target.value }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-to">To</Label>
                <Input
                  id="route-to"
                  value={routeForm.to}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, to: event.target.value }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-duration">Duration</Label>
                <Input
                  id="route-duration"
                  value={routeForm.duration}
                  onChange={(event) =>
                    setRouteForm((current) => ({
                      ...current,
                      duration: event.target.value,
                    }))
                  }
                  placeholder="6h 15m"
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-distance">Distance (km)</Label>
                <Input
                  id="route-distance"
                  type="number"
                  min={1}
                  value={routeForm.distance}
                  onChange={(event) =>
                    setRouteForm((current) => ({
                      ...current,
                      distance: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
            </div>

            {routeError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {routeError}
              </p>
            ) : null}

            <DialogFooter className="rounded-b-none border-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setRouteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-2xl" disabled={routePending}>
                {routePending ? "Creating..." : "Create route"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={busDialogOpen} onOpenChange={setBusDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a new bus</DialogTitle>
            <DialogDescription>
              Publish a departure with its date, seats, and ticket price.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bus-route">Route</Label>
              <Select
                value={busForm.routeId}
                onValueChange={(value) =>
                  value
                    ? setBusForm((current) => ({ ...current, routeId: value }))
                    : undefined
                }
              >
                <SelectTrigger
                  id="bus-route"
                  className="h-11 w-full rounded-2xl"
                >
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bus-date">Date</Label>
                <Input
                  id="bus-date"
                  type="date"
                  value={busForm.date}
                  onChange={(event) =>
                    setBusForm((current) => ({ ...current, date: event.target.value }))
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
                  value={busForm.departureTime}
                  onChange={(event) =>
                    setBusForm((current) => ({
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
                  value={busForm.arrivalTime}
                  onChange={(event) =>
                    setBusForm((current) => ({
                      ...current,
                      arrivalTime: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bus-total-seats">Total seats</Label>
                <Input
                  id="bus-total-seats"
                  type="number"
                  min={1}
                  value={busForm.totalSeats}
                  onChange={(event) =>
                    setBusForm((current) => ({
                      ...current,
                      totalSeats: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bus-price">Price per seat</Label>
                <Input
                  id="bus-price"
                  type="number"
                  min={1}
                  value={busForm.pricePerSeat}
                  onChange={(event) =>
                    setBusForm((current) => ({
                      ...current,
                      pricePerSeat: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl"
                  required
                />
              </div>
            </div>

            {busError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {busError}
              </p>
            ) : null}

            <DialogFooter className="rounded-b-none border-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => setBusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-2xl" disabled={busPending}>
                {busPending ? "Creating..." : "Create bus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
