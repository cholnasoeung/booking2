import AdminPanel from "@/components/admin/admin-panel";
import AdminSidebar from "@/components/admin/admin-sidebar";
import NotificationBell from "@/components/dashboard/notification-bell";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/db/queries";
import { BusFront, MapPinned, Package, Ticket, Users, LayoutDashboard } from "lucide-react";

export default async function AdminPage() {
  await requireAdmin("/dashboard");
  const snapshot = await getAdminSnapshot();
  const user = await getCurrentUser();

  const stats = [
    { label: "Routes",   value: snapshot.routes.length,           icon: MapPinned },
    { label: "Buses",    value: snapshot.buses.length,            icon: BusFront  },
    { label: "Fleet",    value: snapshot.busDetails?.length ?? 0, icon: Package   },
    { label: "Drivers",  value: snapshot.drivers.length,          icon: Users     },
    { label: "Bookings", value: snapshot.bookings.length,         icon: Ticket    },
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <AdminSidebar userName={user?.name || "Admin"} userEmail={user?.email || "admin@example.com"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#1a2035] border-b border-white/[0.08] shadow-lg">
          <div className="px-5 py-3 lg:px-8">
            <div className="flex items-center justify-between gap-4">

              {/* Left: Identity */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.1] border border-white/[0.12]">
                  <LayoutDashboard className="size-4 text-slate-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-white tracking-tight leading-none">
                      Control Center
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5 leading-none">
                    Bus Booking Management System
                  </p>
                </div>
              </div>

              {/* Right: Bell + Stat chips */}
              <div className="flex items-center gap-3">
                <NotificationBell />

                {/* Divider */}
                <div className="hidden md:block h-7 w-px bg-white/[0.1]" />

                {/* Stat chips */}
                <div className="hidden md:flex items-center gap-1.5">
                  {stats.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.09] px-3 py-2 transition-colors"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                        <Icon className="size-3.5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{value}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 leading-none">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile: compact chips */}
                <div className="flex md:hidden items-center gap-1.5">
                  {stats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.07] px-2 py-1">
                      <Icon className="size-3 text-slate-400" />
                      <span className="text-xs font-bold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 bg-[#eef1fb] px-6 py-6 lg:px-8 lg:py-8">
          <AdminPanel {...snapshot} />
        </div>
      </div>
    </div>
  );
}
