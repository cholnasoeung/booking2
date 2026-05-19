import Navbar from "@/components/navbar";
import DashboardBookings from "@/components/dashboard-bookings";
import { requireUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";
import { User } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";

export default async function DashboardPage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard");
  const bookings = await getUserBookings(user.id);

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Header with Profile & Logout */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/referral"
              className="flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-100 transition-all shadow-sm"
            >
              <span>🎁</span>
              <span>Refer &amp; Earn</span>
            </Link>
            <Link
              href="/dashboard/waitlist"
              className="flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-all shadow-sm"
            >
              <span>🔔</span>
              <span>Waitlist</span>
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
            <LogoutButton />
          </div>
        </div>

        <DashboardBookings initialBookings={bookings} />
      </div>
    </>
  );
}
