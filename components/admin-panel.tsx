"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BusFront, MapPinned, PencilLine, Plus, Ticket } from "lucide-react";

import AdminBusDialog from "@/components/admin-bus-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatBusType,
  formatCurrency,
  formatSeatList,
  formatTravelDate,
} from "@/lib/formatters";
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
  const [selectedBus, setSelectedBus] = useState<BusSummary | null>(null);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [routePending, setRoutePending] = useState(false);
  const [routeError, setRouteError] = useState("");

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
              <Button
                type="button"
                size="lg"
                className="rounded-full"
                onClick={() => setRouteDialogOpen(true)}
              >
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
                  Publish schedules, assign the right vehicle type, and keep each
                  departure&apos;s seat map polished.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-full"
                disabled={routes.length === 0}
                onClick={() => {
                  setSelectedBus(null);
                  setBusDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add bus
              </Button>
            </CardHeader>
            <CardContent>
              {buses.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-border/80 bg-secondary/50 px-5 py-8 text-sm text-muted-foreground">
                  Create your first departure to start selling seats. Each bus can
                  now use a mini bus, sleeping bus, or car layout.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead>Bus type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Fare</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((bus) => (
                      <TableRow key={bus.id}>
                        <TableCell>{`${bus.from} to ${bus.to}`}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
                        </TableCell>
                        <TableCell>{formatTravelDate(bus.travelDate)}</TableCell>
                        <TableCell>{`${bus.departureTime} to ${bus.arrivalTime}`}</TableCell>
                        <TableCell>{formatCurrency(bus.pricePerSeat)}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                              {bus.seatsLeft} left / {bus.totalSeats} total
                            </p>
                            <p className="text-muted-foreground">
                              {bus.bookedSeats.length} booked
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bus.templateStatus === "custom" ? "outline" : "secondary"}>
                            {bus.templateStatus === "custom" ? "Custom" : "Template"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              setSelectedBus(bus);
                              setBusDialogOpen(true);
                            }}
                          >
                            <PencilLine className="size-4" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
            <CardHeader>
              <CardTitle>Customer bookings</CardTitle>
              <CardDescription>
                Track confirmed tickets, cancellations, and demand across every
                vehicle type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Trip</TableHead>
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
                        {booking.bus ? (
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {booking.bus.from} to {booking.bus.to}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">
                                {formatBusType(booking.bus.busType)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {booking.bus.departureTime} to {booking.bus.arrivalTime}
                              </span>
                            </div>
                          </div>
                        ) : (
                          "Unavailable"
                        )}
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

      <AdminBusDialog
        open={busDialogOpen}
        routes={routes}
        bus={selectedBus}
        onOpenChange={(open) => {
          setBusDialogOpen(open);

          if (!open) {
            setSelectedBus(null);
          }
        }}
      />
    </>
  );
}
