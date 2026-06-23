import Link from "next/link";
import { User, Bus, MapPin, Star } from "lucide-react";

import DashboardBookings from "@/components/dashboard-bookings";
import LoyaltyCard from "@/components/loyalty-card";
import LogoutButton from "@/components/logout-button";
import Navbar from "@/components/navbar";
import WaitlistCard from "@/components/waitlist-card";
import { requireUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard");
  const bookings = await getUserBookings(user.id);

  const initials = user.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "U";

  return (
    <>
      <Navbar />

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white backdrop-blur">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-200">Welcome back</p>
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <p className="text-sm text-indigo-200">{user.email}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/dashboard/loyalty"
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
              >
                <Star className="h-4 w-4" />
                Loyalty
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
              >
                <Bus className="h-4 w-4" />
                Book a trip
              </Link>
              <LogoutButton />
            </div>
          </div>

          {/* Quick nav pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              <MapPin className="h-3 w-3" />
              {bookings.length} trip{bookings.length !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              {bookings.filter((b) => b.status === "confirmed").length} confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-slate-50 min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">My Bookings</h2>
                <p className="text-sm text-slate-500">
                  Review upcoming departures, view tickets, or cancel bookings.
                </p>
              </div>
              <DashboardBookings initialBookings={bookings} />
            </div>
            <div className="space-y-5">
              <LoyaltyCard />
              <WaitlistCard />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
