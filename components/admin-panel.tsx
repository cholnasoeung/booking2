"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BusFront, MapPinned, PencilLine, Plus, Ticket, TrendingUp } from "lucide-react";

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
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "routes";

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
      {activeTab === "routes" && (
        <Card className="border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 shadow-xl backdrop-blur-xl">
          <CardHeader className="border-b-2 border-dashed border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                  <MapPinned className="size-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Route Directory</CardTitle>
                  <CardDescription className="text-sm">
                    Manage city pairs, durations, and distances
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg hover:shadow-xl transition-all"
                onClick={() => setRouteDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add Route
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-emerald-200/50 bg-white/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:bg-transparent">
                    <TableHead className="font-bold text-emerald-900">From</TableHead>
                    <TableHead className="font-bold text-emerald-900">To</TableHead>
                    <TableHead className="font-bold text-emerald-900">Duration</TableHead>
                    <TableHead className="font-bold text-emerald-900">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id} className="hover:bg-emerald-50/50 transition-colors">
                      <TableCell className="font-medium">{route.from}</TableCell>
                      <TableCell className="font-medium">{route.to}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {route.duration}
                        </Badge>
                      </TableCell>
                      <TableCell>{route.distance} km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "buses" && (
        <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white to-orange-50/50 shadow-xl backdrop-blur-xl">
          <CardHeader className="border-b-2 border-dashed border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
                  <BusFront className="size-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Bus Departures</CardTitle>
                  <CardDescription className="text-sm">
                    Publish schedules and manage seat layouts
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 shadow-lg hover:shadow-xl transition-all"
                disabled={routes.length === 0}
                onClick={() => {
                  setSelectedBus(null);
                  setBusDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add Bus
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {buses.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-gradient-to-br from-orange-50/50 to-orange-100/50 px-8 py-12 text-center">
                <BusFront className="mx-auto size-12 text-orange-400 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No buses yet. Create your first departure to start selling seats.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-orange-200/50 bg-white/80 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 hover:bg-transparent">
                      <TableHead className="font-bold text-orange-900">Route</TableHead>
                      <TableHead className="font-bold text-orange-900">Bus Type</TableHead>
                      <TableHead className="font-bold text-orange-900">Date</TableHead>
                      <TableHead className="font-bold text-orange-900">Schedule</TableHead>
                      <TableHead className="font-bold text-orange-900">Fare</TableHead>
                      <TableHead className="font-bold text-orange-900">Seats</TableHead>
                      <TableHead className="font-bold text-orange-900">Layout</TableHead>
                      <TableHead className="text-right font-bold text-orange-900">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((bus) => (
                      <TableRow key={bus.id} className="hover:bg-orange-50/50 transition-colors">
                        <TableCell className="font-medium">{`${bus.from} to ${bus.to}`}</TableCell>
                        <TableCell>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                            {formatBusType(bus.busType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTravelDate(bus.travelDate)}</TableCell>
                        <TableCell>{`${bus.departureTime} to ${bus.arrivalTime}`}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(bus.pricePerSeat)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {bus.seatsLeft} / {bus.totalSeats}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bus.bookedSeats.length} booked
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={bus.templateStatus === "custom" ? "outline" : "secondary"}
                            className={bus.templateStatus === "custom" ? "border-orange-300" : ""}
                          >
                            {bus.templateStatus === "custom" ? "Custom" : "Template"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-lg transition-all"
                            onClick={() => {
                              setSelectedBus(bus);
                              setBusDialogOpen(true);
                            }}
                          >
                            <PencilLine className="size-4" />
                            <span className="hidden sm:inline ml-2">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "bookings" && (
        <Card className="border-2 border-pink-200/60 bg-gradient-to-br from-white to-pink-50/50 shadow-xl backdrop-blur-xl">
          <CardHeader className="border-b-2 border-dashed border-pink-200/60 bg-gradient-to-r from-pink-50 to-rose-50">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
                <Ticket className="size-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Customer Bookings</CardTitle>
                <CardDescription className="text-sm">
                  Track confirmed tickets and cancellations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-pink-200/50 bg-white/80 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-pink-50 to-rose-50 hover:bg-transparent">
                    <TableHead className="font-bold text-pink-900">Passenger</TableHead>
                    <TableHead className="font-bold text-pink-900">Trip</TableHead>
                    <TableHead className="font-bold text-pink-900">Seats</TableHead>
                    <TableHead className="font-bold text-pink-900">Total</TableHead>
                    <TableHead className="font-bold text-pink-900">Status</TableHead>
                    <TableHead className="font-bold text-pink-900">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-pink-50/50 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {booking.user?.name || "Unknown"}
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
                              {booking.bus.from} → {booking.bus.to}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-pink-100 text-pink-700 border-pink-200">
                                {formatBusType(booking.bus.busType)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {booking.bus.departureTime}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unavailable</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-pink-100 text-pink-700 border-pink-200">
                          {formatSeatList(booking.seats)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(booking.totalPrice)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={booking.status === "confirmed" ? "default" : "secondary"}
                          className={
                            booking.status === "confirmed"
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTravelDate(booking.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Route Dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="sm:max-w-lg border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 shadow-2xl">
          <DialogHeader className="border-b-2 border-dashed border-emerald-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <Plus className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Add New Route</DialogTitle>
                <DialogDescription>
                  Create a city pair for admins to attach departures
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submitRoute} className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-from" className="text-sm font-semibold">From</Label>
                <Input
                  id="route-from"
                  value={routeForm.from}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, from: event.target.value }))
                  }
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="e.g., Phnom Penh"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-to" className="text-sm font-semibold">To</Label>
                <Input
                  id="route-to"
                  value={routeForm.to}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, to: event.target.value }))
                  }
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="e.g., Siem Reap"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-duration" className="text-sm font-semibold">Duration</Label>
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
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-distance" className="text-sm font-semibold">Distance (km)</Label>
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
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder="e.g., 320"
                  required
                />
              </div>
            </div>

            {routeError ? (
              <p className="rounded-xl border-2 border-red-200/60 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                ⚠️ {routeError}
              </p>
            ) : null}

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-2 border-emerald-200/60 hover:bg-emerald-50"
                onClick={() => setRouteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg hover:shadow-xl transition-all"
                disabled={routePending}
              >
                {routePending ? "Creating..." : "Create Route"}
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
