import { notFound } from "next/navigation";

import SeatSelection from "@/components/seat-selection";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  formatBusType,
  formatCurrency,
  formatTravelDate,
} from "@/lib/formatters";
import { getBusSummary } from "@/lib/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/validation";

type BookPageProps = {
  params: Promise<{ busId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BookPage({
  params,
  searchParams,
}: BookPageProps) {
  const { busId } = await params;
  const query = await searchParams;
  const passengers = parsePassengerCount(getFirstSearchParam(query.passengers));

  await requireUser(
    `/login?callbackUrl=${encodeURIComponent(`/book/${busId}?passengers=${passengers}`)}`
  );

  const bus = await getBusSummary(busId);

  if (!bus) {
    notFound();
  }

  const selectionLimit = bus.seatsLeft > 0 ? Math.min(passengers, bus.seatsLeft) : 1;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Seat selection
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            {bus.from} to {bus.to}
          </h1>
          <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatTravelDate(bus.travelDate)} | {bus.departureTime} to {bus.arrivalTime}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardHeader>
            <CardTitle>Trip details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bus type</span>
              <span className="font-medium text-foreground">{formatBusType(bus.busType)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{bus.duration}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium text-foreground">{bus.distance} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price per seat</span>
              <span className="font-medium text-foreground">
                {formatCurrency(bus.pricePerSeat)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seats left</span>
              <span className="font-medium text-foreground">{bus.seatsLeft}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Requested seats</span>
              <span className="font-medium text-foreground">{passengers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Layout style</span>
              <span className="font-medium text-foreground">
                {bus.templateStatus === "custom" ? "Custom" : "Template"}
              </span>
            </div>
            {bus.seatsLeft < passengers ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                Only {bus.seatsLeft} seat(s) remain on this departure, so your
                selection limit was adjusted.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
          <CardHeader>
            <CardTitle>Booking policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Choose seats first, then confirm your booking from the summary card.</p>
            <p>
              If someone books the same seat at the same time, you&apos;ll be prompted
              to choose again before checkout finishes.
            </p>
          </CardContent>
        </Card>
      </div>

      <SeatSelection bus={bus} selectionLimit={selectionLimit} />
    </div>
  );
}
