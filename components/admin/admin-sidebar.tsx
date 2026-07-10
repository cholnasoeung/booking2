"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BusFront, Home, LayoutDashboard, MapPinned, Menu, Ticket, X,
  BarChart3, Tags, Bell, FileSpreadsheet, Shield, Activity, Package,
  ChevronRight, Users, LogOut, UserCog, MessageSquare, Star,
  CalendarClock, MonitorCheck, ScanLine, Settings, Fuel, Wallet, Wrench, CalendarDays,
  Briefcase, Banknote, PackageSearch, RotateCcw, AlertTriangle, Search,
  UserCheck, CalendarOff, Navigation, TrendingUp,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    title: "Main",
    items: [
      { title: "Dashboard",       href: "/admin",                     icon: LayoutDashboard, gradient: "from-indigo-500 to-violet-600" },
      { title: "Today",           href: "/admin?tab=today",            icon: CalendarClock,   gradient: "from-rose-500 to-pink-600",    badge: "Live" },
      { title: "Routes",          href: "/admin?tab=routes",           icon: MapPinned,       gradient: "from-emerald-500 to-teal-600" },
      { title: "Buses",           href: "/admin?tab=buses",            icon: BusFront,        gradient: "from-orange-500 to-amber-600" },
      { title: "Bookings",        href: "/admin?tab=bookings",         icon: Ticket,          gradient: "from-pink-500 to-rose-600" },
      { title: "Counter Booking", href: "/admin?tab=counter-booking",  icon: MonitorCheck,    gradient: "from-teal-500 to-cyan-600" },
      { title: "Check-in Board",  href: "/admin?tab=checkin",          icon: ScanLine,        gradient: "from-blue-500 to-indigo-600" },
    ],
  },
  {
    title: "Analytics & Insights",
    items: [
      { title: "Analytics",       href: "/admin?tab=analytics",         icon: BarChart3,       gradient: "from-cyan-500 to-blue-600",     badge: "New" },
      { title: "Finance",         href: "/admin?tab=finance",           icon: Wallet,          gradient: "from-emerald-500 to-teal-600",  badge: "New" },
      { title: "Driver Perf.",    href: "/admin?tab=driver-performance",icon: Activity,        gradient: "from-violet-500 to-purple-600", badge: "New" },
      { title: "Reports",         href: "/admin?tab=reports",           icon: FileSpreadsheet, gradient: "from-indigo-500 to-violet-600" },
      { title: "System Status",   href: "/admin?tab=system-status",     icon: Activity,        gradient: "from-green-500 to-emerald-600" },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Users",           href: "/admin?tab=users",         icon: UserCog,       gradient: "from-violet-500 to-purple-600" },
      { title: "Support Inbox",   href: "/admin?tab=support-inbox", icon: MessageSquare, gradient: "from-sky-500 to-blue-600" },
      { title: "Ratings",         href: "/admin?tab=ratings",       icon: Star,          gradient: "from-amber-500 to-orange-600" },
      { title: "Employees",       href: "/admin?tab=employees",     icon: Briefcase,     gradient: "from-emerald-500 to-teal-600" },
      { title: "Attendance",      href: "/admin?tab=attendance",    icon: UserCheck,     gradient: "from-indigo-500 to-blue-600" },
      { title: "Leave Requests",  href: "/admin?tab=leave-requests",icon: CalendarOff,   gradient: "from-rose-500 to-pink-600" },
      { title: "Lost & Found",    href: "/admin?tab=lost-found",    icon: PackageSearch, gradient: "from-teal-500 to-cyan-600" },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Drivers",         href: "/admin?tab=drivers",         icon: Users,           gradient: "from-cyan-500 to-sky-600" },
      { title: "Driver Roster",   href: "/admin?tab=driver-roster",   icon: CalendarDays,    gradient: "from-indigo-500 to-violet-600" },
      { title: "Bus Details",     href: "/admin?tab=bus-details",     icon: Package,         gradient: "from-slate-400 to-gray-500" },
      { title: "Incidents",       href: "/admin?tab=incidents",       icon: AlertTriangle,   gradient: "from-rose-500 to-red-600",    badge: "New" },
      { title: "Fuel Logs",       href: "/admin?tab=fuel-logs",       icon: Fuel,            gradient: "from-amber-500 to-orange-600" },
      { title: "Driver Earnings", href: "/admin?tab=driver-earnings", icon: Wallet,          gradient: "from-violet-500 to-purple-600" },
      { title: "Maintenance",     href: "/admin?tab=maintenance",     icon: Wrench,          gradient: "from-rose-500 to-red-600" },
      { title: "Payroll",         href: "/admin?tab=payroll",         icon: Banknote,        gradient: "from-emerald-500 to-cyan-600" },
      { title: "Refunds",         href: "/admin?tab=refunds",         icon: RotateCcw,       gradient: "from-rose-500 to-pink-600" },
      { title: "Route Stops",     href: "/admin?tab=route-stops",     icon: Navigation,      gradient: "from-teal-500 to-cyan-600" },
      { title: "Pricing Rules",   href: "/admin?tab=pricing-rules",   icon: TrendingUp,      gradient: "from-orange-500 to-amber-600" },
      { title: "Promo Codes",     href: "/admin?tab=promo-codes",     icon: Tags,            gradient: "from-violet-500 to-purple-600" },
      { title: "Import/Export",   href: "/admin?tab=import-export",   icon: FileSpreadsheet, gradient: "from-amber-500 to-orange-600" },
      { title: "Settings",        href: "/admin?tab=settings",        icon: Settings,        gradient: "from-slate-500 to-slate-700" },
    ],
  },
  {
    title: "Security & Monitoring",
    items: [
      { title: "Alerts",      href: "/admin?tab=alerts",      icon: Bell,   gradient: "from-red-500 to-rose-600",   badge: "New" },
      { title: "Audit Logs",  href: "/admin?tab=audit-logs",  icon: Shield, gradient: "from-slate-500 to-gray-600" },
      { title: "Security",    href: "/admin?tab=security",    icon: Shield, gradient: "from-blue-600 to-indigo-700" },
    ],
  },
];

// Static class strings so Tailwind can scan them
const sectionStyles = [
  { dot: "bg-indigo-400", text: "text-indigo-400", activeBg: "bg-indigo-500/10", hoverBg: "hover:bg-indigo-500/15" },
  { dot: "bg-cyan-400",   text: "text-cyan-400",   activeBg: "bg-cyan-500/10",   hoverBg: "hover:bg-cyan-500/15" },
  { dot: "bg-violet-400", text: "text-violet-400", activeBg: "bg-violet-500/10", hoverBg: "hover:bg-violet-500/15" },
  { dot: "bg-amber-400",  text: "text-amber-400",  activeBg: "bg-amber-500/10",  hoverBg: "hover:bg-amber-500/15" },
  { dot: "bg-red-400",    text: "text-red-400",    activeBg: "bg-red-500/10",    hoverBg: "hover:bg-red-500/15" },
] as const;

type AdminSidebarProps = { userName: string; userEmail?: string };

export default function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Only "Main" is expanded by default
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(navSections.slice(1).map((s) => s.title))
  );
  const [search, setSearch] = useState("");
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

  const filteredSections = useMemo(() => {
    if (!search.trim()) return navSections.map((s, i) => ({ ...s, originalIndex: i }));
    const q = search.toLowerCase();
    return navSections
      .map((sec, i) => ({
        ...sec,
        originalIndex: i,
        items: sec.items.filter((item) => item.title.toLowerCase().includes(q)),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [search]);

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
          "bg-[#0c1120] border-r border-white/[0.06] shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow shrink-0">
              <LayoutDashboard className="size-4 text-white" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
            </div>
            <div>
              <h2 className="font-bold text-white text-[15px] leading-tight">Admin</h2>
              <p className="text-[9px] text-slate-500 uppercase tracking-[0.22em] font-medium mt-0.5">Control Center</p>
            </div>
          </Link>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick search..."
              className="w-full h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] pl-8 pr-8 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.07] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {filteredSections.map((section) => {
            const si = section.originalIndex;
            const style = sectionStyles[si] ?? sectionStyles[0];
            const isCollapsed = !search && collapsedSections.has(section.title);
            const showItems = search ? true : !isCollapsed;

            return (
              <div key={section.title}>
                {/* Section header */}
                <button
                  onClick={() => !search && toggleSection(section.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group",
                    showItems
                      ? cn(style.activeBg, style.hoverBg)
                      : "hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-all", style.dot, !showItems && "opacity-40")} />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                      showItems ? style.text : "text-slate-400 group-hover:text-slate-300"
                    )}>
                      {section.title}
                    </span>
                  </div>
                  {!search && (
                    <ChevronRight className={cn(
                      "size-3 transition-all duration-200",
                      showItems ? cn(style.text, "rotate-90") : "text-slate-500 group-hover:text-slate-300"
                    )} />
                  )}
                </button>

                {/* Nav items */}
                {showItems && (
                  <div className="mt-0.5 mb-1 space-y-0.5">
                    {section.items.map((item) => {
                      const itemTab = item.href.split("?tab=")[1] || "overview";
                      const isActive = pathname === "/admin" && activeTab === itemTab;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] transition-all duration-150",
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                          )}
                        >
                          {/* Active left bar */}
                          {isActive && (
                            <div className={cn(
                              "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-gradient-to-b",
                              item.gradient
                            )} />
                          )}

                          {/* Icon */}
                          <div className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
                            isActive ? "bg-white/[0.15]" : "bg-white/[0.06] group-hover:bg-white/[0.11]"
                          )}>
                            <item.icon className={cn(
                              "size-3.5 transition-colors",
                              isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                          </div>

                          {/* Label + badge */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[13px] font-medium leading-none truncate">{item.title}</span>
                            {item.badge && (
                              <span className={cn(
                                "shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border",
                                item.badge === "Live"
                                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                  : "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider + Back link */}
          <div className="pt-1 mt-1 border-t border-white/[0.06]">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-slate-300 hover:bg-white/[0.07] hover:text-white transition-all duration-150 mt-1"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] group-hover:bg-white/[0.13] transition-all">
                <Home className="size-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[13px] font-medium">Back to Dashboard</span>
            </Link>
          </div>
        </nav>

        {/* User card */}
        <div className="px-3 pb-3 pt-2 border-t border-white/[0.06]">
          <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
            {/* Top glow bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {/* Ambient glow behind avatar */}
            <div className="absolute top-3 left-4 w-10 h-10 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

            <div className="px-3 pt-3 pb-2.5 flex items-center gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-violet-500 to-purple-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-900/50 ring-2 ring-white/[0.12]">
                  {userInitials || "A"}
                </div>
                {/* Online pulse */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0c1120]" />
                </span>
              </div>

              {/* Name + role + email */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white leading-tight truncate">{userName}</p>
                {userEmail && (
                  <p className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">{userEmail}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full">
                    <Shield className="size-2.5" />
                    Administrator
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-1.5">
              <Link
                href="/dashboard/profile"
                className="group flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-indigo-500/15 border border-white/[0.07] hover:border-indigo-500/30 px-2 py-2 text-[11px] font-semibold text-slate-400 hover:text-indigo-300 transition-all duration-200"
              >
                <Users className="size-3.5 shrink-0 group-hover:scale-110 transition-transform" />
                Profile
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="group flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-red-500/15 border border-white/[0.07] hover:border-red-500/30 px-2 py-2 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="size-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
