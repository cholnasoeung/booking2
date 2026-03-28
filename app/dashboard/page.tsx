import DashboardBookings from "@/components/dashboard-bookings";
import { requireUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard");
  const bookings = await getUserBookings(user.id);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          My bookings
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Trips booked for {user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Review your upcoming departures, open ticket details, or cancel bookings
          when your plans change.
        </p>
      </div>

      <DashboardBookings initialBookings={bookings} />
    </div>
  );
}
