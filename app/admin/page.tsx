import AdminPanel from "@/components/admin-panel";
import { requireAdmin } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/queries";

export default async function AdminPage() {
  await requireAdmin("/dashboard");
  const snapshot = await getAdminSnapshot();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Admin control room
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Manage routes, departures, and all bookings
        </h1>
        <p className="text-sm text-muted-foreground">
          Add new routes, publish buses, and review every booking created in the
          system.
        </p>
      </div>

      <AdminPanel {...snapshot} />
    </div>
  );
}
