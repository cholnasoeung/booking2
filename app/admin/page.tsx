import AdminPanel from "@/components/admin/admin-panel";
import AdminSidebar from "@/components/admin/admin-sidebar";
import NotificationBell from "@/components/dashboard/notification-bell";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/db/queries";
import { BusFront, MapPinned, Package, Ticket, Users } from "lucide-react";

export default async function AdminPage() {
  await requireAdmin("/dashboard");
  const snapshot = await getAdminSnapshot();
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <AdminSidebar userName={user?.name || "Admin"} userEmail={user?.email || "admin@example.com"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">

        {/* Header — mid-dark navy, lighter than sidebar */}
        <header className="sticky top-0 z-10 bg-gradient-to-r from-[#1a2744] via-[#1e3058] to-[#1a2744] border-b border-white/10 shadow-lg shadow-black/20">
          <div className="px-6 py-3.5 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              {/* Left: Title */}
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl leading-tight">
                  Control Center
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                  Manage your bus booking system
                </p>
              </div>

              {/* Right: Bell + stat chips */}
              <div className="flex items-center gap-2">
                <NotificationBell />

                <div className="flex items-center gap-1.5">
                  {/* Routes */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.15] px-2.5 py-1.5 hover:bg-white/[0.15] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                      <MapPinned className="size-3.5 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{snapshot.routes.length}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Routes</p>
                    </div>
                  </div>

                  {/* Buses */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.15] px-2.5 py-1.5 hover:bg-white/[0.15] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                      <BusFront className="size-3.5 text-violet-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{snapshot.buses.length}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Buses</p>
                    </div>
                  </div>

                  {/* Fleet */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.15] px-2.5 py-1.5 hover:bg-white/[0.15] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
                      <Package className="size-3.5 text-cyan-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{snapshot.busDetails?.length ?? 0}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Fleet</p>
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.15] px-2.5 py-1.5 hover:bg-white/[0.15] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                      <Users className="size-3.5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{snapshot.drivers.length}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Drivers</p>
                    </div>
                  </div>

                  {/* Bookings */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.08] border border-white/[0.15] px-2.5 py-1.5 hover:bg-white/[0.15] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                      <Ticket className="size-3.5 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{snapshot.bookings.length}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content — blue-indigo tinted background */}
        <div className="flex-1 bg-[#eef1fb] px-6 py-6 lg:px-8 lg:py-8">
          <AdminPanel {...snapshot} />
        </div>
      </div>
    </div>
  );
}
