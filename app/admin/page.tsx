import AdminPanel from "@/components/admin-panel";
import AdminSidebar from "@/components/admin-sidebar";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/queries";
import { BusFront, MapPinned, Package, Ticket, Users } from "lucide-react";

export default async function AdminPage() {
  await requireAdmin("/dashboard");
  const snapshot = await getAdminSnapshot();
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar - Fixed, doesn't move */}
      <AdminSidebar userName={user?.name || "Admin"} userEmail={user?.email || "admin@example.com"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Title */}
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Control Center
                  </h1>
                  <p className="text-sm text-gray-600 hidden sm:block">
                    Manage your bus booking system
                  </p>
                </div>
              </div>

              {/* Right: Stats Cards */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Routes */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 sm:h-9 sm:w-9">
                    <MapPinned className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{snapshot.routes.length}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Routes</p>
                  </div>
                </div>

                {/* Buses */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 sm:h-9 sm:w-9">
                    <BusFront className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{snapshot.buses.length}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Buses</p>
                  </div>
                </div>

                {/* Fleet */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 sm:h-9 sm:w-9">
                    <Package className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{snapshot.busDetails?.length ?? 0}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Fleet</p>
                  </div>
                </div>

                {/* Drivers */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 sm:h-9 sm:w-9">
                    <Users className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{snapshot.drivers.length}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Drivers</p>
                  </div>
                </div>

                {/* Bookings */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 sm:h-9 sm:w-9">
                    <Ticket className="size-4 sm:size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{snapshot.bookings.length}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 px-6 py-6 lg:px-8 lg:py-8">
          <AdminPanel {...snapshot} />
        </div>
      </div>
    </div>
  );
}
