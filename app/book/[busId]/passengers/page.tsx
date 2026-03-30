import { notFound, redirect } from "next/navigation";
import { getBusSummary } from "@/lib/queries";
import PassengerDetailsForm from "@/components/passenger-details-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import type { Passenger } from "@/types/passenger";

type PassengersPageProps = {
  params: Promise<{ busId: string }>;
  searchParams: Promise<{ seats?: string }>;
};

async function createBooking(
  busId: string,
  userId: string,
  selectedSeats: string[],
  passengers: Passenger[],
  pricePerSeat: number
) {
  "use server";

  const { createBooking } = await import("@/lib/actions");
  const totalPrice = passengers.length * pricePerSeat;

  try {
    const booking = await createBooking({
      busId,
      userId,
      seats: selectedSeats,
      passengers,
      totalPrice,
    });

    return { success: true, bookingId: booking.id };
  } catch (error: any) {
    console.error("Booking creation error:", error);
    return {
      success: false,
      error: error?.message || "Failed to create booking. Please try again."
    };
  }
}

export default async function PassengersPage({ params, searchParams }: PassengersPageProps) {
  const { busId } = await params;
  const query = await searchParams;
  const user = await requireUser(`/login?callbackUrl=${encodeURIComponent(`/book/${busId}/passengers`)}`);

  const bus = await getBusSummary(busId);

  if (!bus) {
    notFound();
  }

  // Get selected seats from query params
  const rawSeats = query.seats;
  if (!rawSeats) {
    redirect(`/book/${busId}`);
  }

  const selectedSeats = rawSeats.split(",");

  // Validate seats are available
  const unavailableSeats = selectedSeats.filter(seat =>
    bus.bookedSeats.includes(seat)
  );

  if (unavailableSeats.length > 0) {
    redirect(`/book/${busId}?error=seats_unavailable`);
  }

  async function handlePassengerSubmit(passengers: Passenger[]) {
    "use server";

    const result = await createBooking(busId, user.id, selectedSeats, passengers, bus.pricePerSeat);
    return result;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <a href="/search" className="hover:text-slate-700">Search</a>
        <span>→</span>
        <a href={`/book/${busId}`} className="hover:text-slate-700">Select Seats</a>
        <span>→</span>
        <span className="font-medium text-slate-900">Passenger Details</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <PassengerDetailsForm
            selectedSeats={selectedSeats}
            seatLabels={selectedSeats}
            pricePerSeat={bus.pricePerSeat}
            onSubmit={handlePassengerSubmit}
          />
        </div>

        {/* Sidebar - Trip Summary */}
        <div className="space-y-4">
          <Card className="border-white/60 bg-white/90 shadow-xl sticky top-6">
            <CardHeader className="border-b border-dashed border-border/80">
              <CardTitle className="text-lg">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Route Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Route</span>
                  <span className="text-sm font-medium text-slate-900">
                    {bus.from} → {bus.to}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Bus Type</span>
                  <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Date</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatTravelDate(bus.travelDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Time</span>
                  <span className="text-sm font-medium text-slate-900">
                    {bus.departureTime} - {bus.arrivalTime}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Duration</span>
                  <span className="text-sm font-medium text-slate-900">{bus.duration}</span>
                </div>
              </div>

              <div className="h-px bg-border/60" />

              {/* Selected Seats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Selected Seats</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat}
                      className="flex h-7 items-center justify-center rounded-full bg-emerald-100 px-2.5 text-xs font-semibold text-emerald-700"
                    >
                      {seat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border/60" />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Price per seat</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(bus.pricePerSeat)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Passengers</span>
                  <span className="font-medium text-slate-900">{selectedSeats.length}</span>
                </div>

                <div className="flex items-center justify-between text-base font-bold">
                  <span className="text-slate-900">Total Amount</span>
                  <span className="text-emerald-600">
                    {formatCurrency(bus.pricePerSeat * selectedSeats.length)}
                  </span>
                </div>
              </div>

              {/* Safety Info */}
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">🛡️ Secure Booking</p>
                <p className="text-blue-700">Your payment information is safe with us. Free cancellation up to 24 hours before departure.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
