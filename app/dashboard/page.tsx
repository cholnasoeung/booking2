import { requireUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/db/queries";
import EmailVerificationBanner from "@/components/auth/email-verification-banner";
import Navbar from "@/components/layout/navbar";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user     = await requireUser("/login?callbackUrl=%2Fdashboard");
  const bookings = await getUserBookings(user.id);

  return (
    <>
      <Navbar />
      <EmailVerificationBanner />
      <DashboardClient user={{ id: user.id, name: user.name ?? "", email: user.email ?? "" }} initialBookings={bookings} />
    </>
  );
}
