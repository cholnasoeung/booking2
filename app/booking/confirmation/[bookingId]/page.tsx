import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  formatBusType,
  formatCurrency,
  formatDateTime,
  formatSeatList,
  formatTravelDate,
} from "@/lib/formatters";
import { getBookingSummaryById } from "@/lib/queries";

type ConfirmationPageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { bookingId } = await params;
  const user = await requireUser(
    `/login?callbackUrl=${encodeURIComponent(`/booking/confirmation/${bookingId}`)}`
  );
  const booking = await getBookingSummaryById(bookingId);

  if (!booking) {
    notFound();
  }

  if (user.role !== "admin" && booking.user?.id !== user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Booking confirmed
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Your ticket is ready
        </h1>
        <p className="text-sm text-muted-foreground">
          Keep this page handy at boarding time or revisit it from your dashboard
          later.
        </p>
      </div>

      <Card className="border-white/60 bg-white/92 shadow-2xl shadow-red-950/10">
        <CardHeader className="flex flex-col gap-4 border-b border-dashed border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Ticket number
              </p>
              <p className="mt-2 font-mono text-lg text-foreground">{booking.id}</p>
            </div>
            <Badge
              variant={booking.status === "confirmed" ? "secondary" : "outline"}
              className="text-sm"
            >
              {booking.status}
            </Badge>
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl">
              {booking.bus
                ? `${booking.bus.from} to ${booking.bus.to}`
                : "Bus details unavailable"}
            </CardTitle>
            {booking.bus ? (
              <Badge variant="secondary" className="w-fit">
                {formatBusType(booking.bus.busType)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 py-6 md:grid-cols-2">
          <div className="space-y-4 rounded-[28px] bg-secondary/70 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Travel date
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {booking.bus ? formatTravelDate(booking.bus.travelDate) : "Unavailable"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Schedule
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {booking.bus
                  ? `${booking.bus.departureTime} to ${booking.bus.arrivalTime}`
                  : "Unavailable"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Seats
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {formatSeatList(booking.seats)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-border/80 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Passenger
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">
                {booking.user?.name || user.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {booking.user?.email || user.email}
              </p>
            </div>

            <div className="rounded-[28px] border border-border/80 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Total fare
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-foreground">
                {formatCurrency(booking.totalPrice)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Booked on {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/bookings/${bookingId}/ticket`}
          download
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Ticket (PDF)
        </a>
        <Link
          href="/dashboard"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
        >
          Go to my bookings
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
        >
          Search another trip
        </Link>
      </div>
    </div>
  );
}
