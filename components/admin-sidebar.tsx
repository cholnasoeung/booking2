"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BusFront, Home, LayoutDashboard, MapPinned, Menu, Ticket, X,
  BarChart3, Tags, Bell, FileSpreadsheet, Shield, Activity, Package,
  ChevronDown, Users, LogOut, UserCog, MessageSquare, Star,
  CalendarClock, MonitorCheck, ScanLine, Settings, Fuel, Wallet, Wrench,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    title: "Main",
    accent: "text-slate-400",
    items: [
      { title: "Dashboard",      href: "/admin",                     icon: LayoutDashboard, gradient: "from-indigo-500 to-violet-600" },
      { title: "Today",          href: "/admin?tab=today",            icon: CalendarClock,   gradient: "from-rose-500 to-pink-600",    badge: "Live" },
      { title: "Routes",         href: "/admin?tab=routes",           icon: MapPinned,       gradient: "from-emerald-500 to-teal-600" },
      { title: "Buses",          href: "/admin?tab=buses",            icon: BusFront,        gradient: "from-orange-500 to-amber-600" },
      { title: "Bookings",       href: "/admin?tab=bookings",         icon: Ticket,          gradient: "from-pink-500 to-rose-600" },
      { title: "Counter Booking",href: "/admin?tab=counter-booking",  icon: MonitorCheck,    gradient: "from-teal-500 to-cyan-600" },
      { title: "Check-in Board", href: "/admin?tab=checkin",          icon: ScanLine,        gradient: "from-blue-500 to-indigo-600" },
    ],
  },
  {
    title: "Analytics & Insights",
    accent: "text-slate-400",
    items: [
      { title: "Analytics",     href: "/admin?tab=analytics",     icon: BarChart3, gradient: "from-cyan-500 to-blue-600",    badge: "New" },
      { title: "System Status", href: "/admin?tab=system-status", icon: Activity,  gradient: "from-green-500 to-emerald-600" },
    ],
  },
  {
    title: "People",
    accent: "text-slate-400",
    items: [
      { title: "Users",         href: "/admin?tab=users",         icon: UserCog,     gradient: "from-violet-500 to-purple-600" },
      { title: "Support Inbox", href: "/admin?tab=support-inbox", icon: MessageSquare, gradient: "from-sky-500 to-blue-600" },
      { title: "Ratings",       href: "/admin?tab=ratings",       icon: Star,        gradient: "from-amber-500 to-orange-600" },
    ],
  },
  {
    title: "Management",
    accent: "text-slate-400",
    items: [
      { title: "Drivers",       href: "/admin?tab=drivers",       icon: Users,           gradient: "from-cyan-500 to-sky-600" },
      { title: "Bus Details",   href: "/admin?tab=bus-details",   icon: Package,         gradient: "from-slate-400 to-gray-500" },
      { title: "Fuel Logs",      href: "/admin?tab=fuel-logs",      icon: Fuel,   gradient: "from-amber-500 to-orange-600" },
      { title: "Driver Earnings", href: "/admin?tab=driver-earnings", icon: Wallet, gradient: "from-violet-500 to-purple-600" },
      { title: "Maintenance",    href: "/admin?tab=maintenance",     icon: Wrench, gradient: "from-rose-500 to-red-600" },
      { title: "Promo Codes",   href: "/admin?tab=promo-codes",   icon: Tags,            gradient: "from-violet-500 to-purple-600" },
      { title: "Import/Export", href: "/admin?tab=import-export", icon: FileSpreadsheet, gradient: "from-amber-500 to-orange-600" },
      { title: "Settings",      href: "/admin?tab=settings",      icon: Settings,        gradient: "from-slate-500 to-slate-700" },
    ],
  },
  {
    title: "Security & Monitoring",
    accent: "text-slate-400",
    items: [
      { title: "Alerts",      href: "/admin?tab=alerts",      icon: Bell,   gradient: "from-red-500 to-rose-600",     badge: "New" },
      { title: "Audit Logs",  href: "/admin?tab=audit-logs",  icon: Shield, gradient: "from-slate-500 to-gray-600" },
      { title: "Security",    href: "/admin?tab=security",    icon: Shield, gradient: "from-blue-600 to-indigo-700" },
    ],
  },
];

type AdminSidebarProps = { userName: string; userEmail: string };

export default function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const activeTab = searchParams?.get("tab") ?? "overview";

  const userInitials = userName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const toggleSection = (title: string) =>
    setCollapsedSections((prev) => {
      const s = new Set(prev);
      s.has(title) ? s.delete(title) : s.add(title);
      return s;
    });

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 flex flex-col transition-transform duration-300",
          "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-white/5 shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-white/8">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
              <LayoutDashboard className="size-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight tracking-tight">Admin</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Control Center</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {navSections.map((section, si) => {
            const isCollapsed = collapsedSections.has(section.title);
            return (
              <div key={section.title} className={si > 0 ? "mt-5" : ""}>
                {/* Section label */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 mb-1.5",
                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                    section.accent, "hover:text-white/70"
                  )}
                >
                  <span>{section.title}</span>
                  <ChevronDown className={cn(
                    "size-3 transition-transform duration-200",
                    isCollapsed && "-rotate-90"
                  )} />
                </button>

                {/* Items */}
                {!isCollapsed && section.items.map((item) => {
                  const itemTab = item.href.split("?tab=")[1] || "overview";
                  const isActive = pathname === "/admin" && activeTab === itemTab;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 mb-0.5 transition-all duration-200",
                        isActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b",
                          item.gradient
                        )} />
                      )}

                      {/* Icon with gradient */}
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                        isActive
                          ? `bg-gradient-to-br ${item.gradient} shadow-md`
                          : `bg-white/5 group-hover:bg-gradient-to-br group-hover:${item.gradient}`
                      )}>
                        <item.icon className={cn(
                          "size-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )} />
                      </div>

                      {/* Label + badge */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        {item.badge && (
                          <span className={cn(
                            "shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full",
                            item.badge === "Live"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-4 border-t border-white/8" />

          {/* Back to site */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
              <Home className="size-4" />
            </div>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </nav>

        {/* User card */}
        <div className="px-3 pb-4 pt-3 border-t border-white/8">
          <div className="rounded-2xl bg-slate-800/60 border border-white/8 backdrop-blur-sm overflow-hidden">
            {/* Top accent strip */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            <div className="p-4">
              {/* Avatar + info row */}
              <div className="flex items-center gap-3 mb-4">
                {/* Avatar with ring */}
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-base font-bold shadow-lg shadow-indigo-900/60">
                    {userInitials || "A"}
                  </div>
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
                  </span>
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">{userName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <p className="text-[10px] text-indigo-300 uppercase tracking-[0.18em] font-semibold">Administrator</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/8 mb-3" />

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/8 hover:bg-indigo-500/30 border border-white/8 hover:border-indigo-500/40 px-2 py-2 text-[11px] font-semibold text-slate-300 hover:text-white transition-all duration-200"
                >
                  <Users className="size-3.5 shrink-0" />
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/8 hover:bg-red-500/25 border border-white/8 hover:border-red-500/40 px-2 py-2 text-[11px] font-semibold text-slate-300 hover:text-red-300 transition-all duration-200"
                >
                  <LogOut className="size-3.5 shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
