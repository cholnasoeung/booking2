import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/db/queries";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AddBusPageClient from "./AddBusPageClient";

export default async function AddBusPage() {
  await requireAdmin("/dashboard");
  const [user, snapshot] = await Promise.all([getCurrentUser(), getAdminSnapshot()]);

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar userName={user?.name ?? "Admin"} />
      <div className="flex-1 lg:ml-64">
        <AddBusPageClient routes={snapshot.routes} />
      </div>
    </div>
  );
}
