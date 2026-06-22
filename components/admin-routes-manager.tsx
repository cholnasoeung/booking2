"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned, PencilLine, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState, PAGE_SIZE, Paginator, SummaryTile, buildRouteUsage, emptyRouteUsage } from "@/components/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmDelete } from "@/lib/swal";
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
import { formatCurrency } from "@/lib/formatters";
import type { AdminBookingSummary, BusSummary, RouteSummary } from "@/lib/queries";

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type RouteFormState = {
  from: string;
  to: string;
  duration: string;
  distance: string;
};

type AdminRoutesManagerProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  bookings: AdminBookingSummary[];
  onFeedback: (feedback: FeedbackState) => void;
};

const emptyRouteForm: RouteFormState = {
  from: "",
  to: "",
  duration: "",
  distance: "",
};

export default function AdminRoutesManager({
  routes,
  buses,
  bookings,
  onFeedback,
}: AdminRoutesManagerProps) {
  const router = useRouter();
  const [routeQuery, setRouteQuery] = useState("");
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteSummary | null>(null);
  const [routeForm, setRouteForm] = useState<RouteFormState>(emptyRouteForm);
  const [routePending, setRoutePending] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeDeletePending, setRouteDeletePending] = useState(false);

  const routeUsage = buildRouteUsage(
    routes.map((route) => route.id),
    buses,
    bookings
  );
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const [page, setPage] = useState(1);

  const normalizedQuery = routeQuery.trim().toLowerCase();
  const visibleRoutes = routes.filter((route) => {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${route.from} ${route.to} ${route.duration} ${route.distance}`
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const totalPages = Math.ceil(visibleRoutes.length / PAGE_SIZE);
  const pagedRoutes = visibleRoutes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [routeQuery]);

  const isEditingRoute = Boolean(selectedRoute);

  function resetRouteDialog() {
    setRouteDialogOpen(false);
    setSelectedRoute(null);
    setRouteForm(emptyRouteForm);
    setRoutePending(false);
    setRouteError("");
  }

  function openCreateRouteDialog() {
    setSelectedRoute(null);
    setRouteForm(emptyRouteForm);
    setRouteError("");
    setRouteDialogOpen(true);
  }

  function openEditRouteDialog(route: RouteSummary) {
    setSelectedRoute(route);
    setRouteForm({
      from: route.from,
      to: route.to,
      duration: route.duration,
      distance: String(route.distance),
    });
    setRouteError("");
    setRouteDialogOpen(true);
  }

  async function submitRoute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoutePending(true);
    setRouteError("");
    onFeedback(null);

    try {
      const endpoint = selectedRoute
        ? `/api/admin/routes/${selectedRoute.id}`
        : "/api/admin/routes";
      const method = selectedRoute ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
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
        const message = payload.message || "Unable to save the route.";
        setRouteError(message);
        onFeedback({ kind: "error", message });
        return;
      }

      onFeedback({
        kind: "success",
        message: selectedRoute
          ? "Route updated successfully."
          : "Route created successfully.",
      });
      resetRouteDialog();
      router.refresh();
    } catch {
      const message = "Unable to save the route right now.";
      setRouteError(message);
      onFeedback({ kind: "error", message });
    } finally {
      setRoutePending(false);
    }
  }

  async function handleRouteDelete(route: RouteSummary) {
    const ok = await confirmDelete(`${route.from} → ${route.to}`);
    if (!ok) return;

    setRouteDeletePending(true);
    onFeedback(null);

    try {
      const response = await fetch(`/api/admin/routes/${route.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        onFeedback({
          kind: "error",
          message: payload.message || "Unable to delete the route.",
        });
        return;
      }

      onFeedback({ kind: "success", message: "Route deleted successfully." });
      router.refresh();
    } catch {
      onFeedback({
        kind: "error",
        message: "Unable to delete the route right now.",
      });
    } finally {
      setRouteDeletePending(false);
    }
  }

  return (
    <>
      <Card className="border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 shadow-xl backdrop-blur-xl">
        <CardHeader className="border-b-2 border-dashed border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <MapPinned className="size-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Route Directory</CardTitle>
                <CardDescription className="text-sm">
                  Create, edit, and retire routes with visibility into their usage
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-600/70" />
                <Input
                  value={routeQuery}
                  onChange={(event) => setRouteQuery(event.target.value)}
                  placeholder="Search by city, duration, or distance"
                  className="h-11 rounded-xl border-emerald-200/70 bg-white/90 pl-9"
                />
              </div>
              <Button
                type="button"
                size="lg"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg transition-all hover:shadow-xl"
                onClick={openCreateRouteDialog}
              >
                <Plus className="size-4" />
                Add Route
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile label="Total routes" value={String(routes.length)} tone="emerald" />
            <SummaryTile
              label="Published departures"
              value={String(buses.length)}
              tone="emerald"
            />
            <SummaryTile
              label="Confirmed bookings"
              value={String(confirmedBookings.length)}
              tone="emerald"
            />
          </div>

          <div className="rounded-2xl border border-emerald-200/50 bg-white/80">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:bg-transparent">
                  <TableHead className="font-bold text-emerald-900">Route</TableHead>
                  <TableHead className="font-bold text-emerald-900">Duration</TableHead>
                  <TableHead className="font-bold text-emerald-900">Distance</TableHead>
                  <TableHead className="font-bold text-emerald-900">Departures</TableHead>
                  <TableHead className="font-bold text-emerald-900">Revenue</TableHead>
                  <TableHead className="text-right font-bold text-emerald-900">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRoutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      <EmptyState
                        icon={<MapPinned className="size-10 text-emerald-300" />}
                        title="No routes match this search"
                        description="Try a different keyword or create a new route."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRoutes.map((route) => {
                    const usage = routeUsage.get(route.id) ?? emptyRouteUsage();

                    return (
                      <TableRow
                        key={route.id}
                        className="transition-colors hover:bg-emerald-50/50"
                      >
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {route.from} to {route.to}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {usage.bookings} total bookings tracked
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {route.duration}
                          </Badge>
                        </TableCell>
                        <TableCell>{route.distance} km</TableCell>
                        <TableCell>{usage.departures}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(usage.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => openEditRouteDialog(route)}
                            >
                              <PencilLine className="size-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => handleRouteDelete(route)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <Paginator
              page={page}
              totalPages={totalPages}
              totalItems={visibleRoutes.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={routeDialogOpen} onOpenChange={(open) => !open && resetRouteDialog()}>
        <DialogContent className="sm:max-w-lg border-2 border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 shadow-2xl">
          <DialogHeader className="border-b-2 border-dashed border-emerald-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                {isEditingRoute ? <PencilLine className="size-5" /> : <Plus className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {isEditingRoute ? "Edit Route" : "Add New Route"}
                </DialogTitle>
                <DialogDescription>
                  {isEditingRoute
                    ? "Update the city pair, travel time, or distance."
                    : "Create a city pair for admins to attach departures."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submitRoute} className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-from" className="text-sm font-semibold">
                  From
                </Label>
                <Input
                  id="route-from"
                  value={routeForm.from}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, from: event.target.value }))
                  }
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90"
                  placeholder="e.g., Phnom Penh"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-to" className="text-sm font-semibold">
                  To
                </Label>
                <Input
                  id="route-to"
                  value={routeForm.to}
                  onChange={(event) =>
                    setRouteForm((current) => ({ ...current, to: event.target.value }))
                  }
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90"
                  placeholder="e.g., Siem Reap"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="route-duration" className="text-sm font-semibold">
                  Duration
                </Label>
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
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-distance" className="text-sm font-semibold">
                  Distance (km)
                </Label>
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
                  className="h-11 rounded-xl border-emerald-200/60 bg-white/90"
                  placeholder="e.g., 320"
                  required
                />
              </div>
            </div>

            {routeError ? (
              <p className="rounded-xl border-2 border-red-200/60 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {routeError}
              </p>
            ) : null}

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-2 border-emerald-200/60 hover:bg-emerald-50"
                onClick={resetRouteDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg transition-all hover:shadow-xl"
                disabled={routePending}
              >
                {routePending
                  ? isEditingRoute
                    ? "Saving..."
                    : "Creating..."
                  : isEditingRoute
                  ? "Save Changes"
                  : "Create Route"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}
