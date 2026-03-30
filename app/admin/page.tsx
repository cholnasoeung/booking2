import AdminPanel from "@/components/admin-panel";
import AdminSidebar from "@/components/admin-sidebar";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/queries";
import { BusFront, MapPinned, Ticket } from "lucide-react";

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
        {/* Enhanced Header */}
        <header className="sticky top-0 z-10 overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-b border-white/10 shadow-lg">
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-white/5 to-transparent" />
            <div className="absolute top-[-50%] left-[-10%] h-[200%] w-[50%] bg-gradient-to-br from-white/10 to-transparent transform -skew-x-12 animate-pulse" />
            <div className="absolute top-[-50%] right-[-10%] h-[200%] w-[50%] bg-gradient-to-bl from-white/10 to-transparent transform skew-x-12 animate-pulse delay-700" />
          </div>

          {/* Floating orbs */}
          <div className="absolute top-0 left-0 h-full w-full overflow-hidden opacity-20">
            <div className="absolute top-[20%] left-[5%] h-32 w-32 rounded-full bg-white/30 blur-2xl animate-pulse" />
            <div className="absolute top-[30%] right-[15%] h-40 w-40 rounded-full bg-white/30 blur-2xl animate-pulse delay-500" />
            <div className="absolute bottom-[10%] left-[30%] h-24 w-24 rounded-full bg-white/30 blur-2xl animate-pulse delay-1000" />
          </div>

          <div className="relative px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: Title and Badge */}
              <div className="flex items-center gap-4">
                {/* Animated Status Badge */}
                <div className="relative hidden sm:block">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                    <svg className="size-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-green-400 animate-ping" />
                </div>

                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Control Center
                  </h1>
                  <p className="text-sm text-white/80 hidden sm:block">
                    Manage your bus booking system
                  </p>
                </div>
              </div>

              {/* Right: Stats Cards with Hover Effects */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Routes */}
                <div className="group relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                  <div className="relative flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 transition-all group-hover:bg-white/25">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg sm:h-9 sm:w-9">
                      <MapPinned className="size-4 sm:size-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{snapshot.routes.length}</p>
                      <p className="text-[9px] text-white/80 uppercase tracking-wider">Routes</p>
                    </div>
                  </div>
                </div>

                {/* Buses */}
                <div className="group relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                  <div className="relative flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 transition-all group-hover:bg-white/25">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg sm:h-9 sm:w-9">
                      <BusFront className="size-4 sm:size-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{snapshot.buses.length}</p>
                      <p className="text-[9px] text-white/80 uppercase tracking-wider">Buses</p>
                    </div>
                  </div>
                </div>

                {/* Bookings */}
                <div className="group relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                  <div className="relative flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-2 transition-all group-hover:bg-white/25">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-lg sm:h-9 sm:w-9">
                      <Ticket className="size-4 sm:size-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{snapshot.bookings.length}</p>
                      <p className="text-[9px] text-white/80 uppercase tracking-wider">Bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
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
