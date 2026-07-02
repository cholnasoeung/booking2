import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/db/queries";
import AdminSidebar from "@/components/admin/admin-sidebar";
import RoutePageClient from "./RoutePageClient";
import { notFound } from "next/navigation";

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function RouteDetailPage({ searchParams }: Props) {
  await requireAdmin("/dashboard");
  const { from = "", to = "" } = await searchParams;

  if (!from || !to) notFound();

  const [user, snapshot] = await Promise.all([
    getCurrentUser(),
    getAdminSnapshot(),
  ]);

  const routeBuses = snapshot.buses.filter((b) => b.from === from && b.to === to);

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar userName={user?.name ?? "Admin"} />
      <div className="flex-1 lg:ml-64">
        <RoutePageClient
          from={from}
          to={to}
          buses={routeBuses}
          routes={snapshot.routes}
          drivers={snapshot.drivers}
        />
      </div>
    </div>
  );
}
