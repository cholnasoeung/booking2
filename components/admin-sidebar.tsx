"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BusFront,
  Home,
  LayoutDashboard,
  MapPinned,
  Menu,
  Ticket,
  X,
  BarChart3,
  Tags,
  Bell,
  FileSpreadsheet,
  Shield,
  Activity,
  Package,
  ChevronDown,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import AdminUserDropdown from "@/components/admin-user-dropdown";

const navSections = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        color: "from-indigo-500 to-purple-600",
      },
      {
        title: "Routes",
        href: "/admin?tab=routes",
        icon: MapPinned,
        color: "from-emerald-500 to-teal-600",
      },
      {
        title: "Buses",
        href: "/admin?tab=buses",
        icon: BusFront,
        color: "from-orange-500 to-red-600",
      },
      {
        title: "Bookings",
        href: "/admin?tab=bookings",
        icon: Ticket,
        color: "from-pink-500 to-rose-600",
      },
    ],
  },
  {
    title: "Analytics & Insights",
    items: [
      {
        title: "Analytics",
        href: "/admin?tab=analytics",
        icon: BarChart3,
        color: "from-cyan-500 to-blue-600",
        badge: "New",
      },
      {
        title: "System Status",
        href: "/admin?tab=system-status",
        icon: Activity,
        color: "from-green-500 to-emerald-600",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Promo Codes",
        href: "/admin?tab=promo-codes",
        icon: Tags,
        color: "from-violet-500 to-purple-600",
        badge: "New",
      },
      {
        title: "Import/Export",
        href: "/admin?tab=import-export",
        icon: FileSpreadsheet,
        color: "from-amber-500 to-orange-600",
        badge: "New",
      },
    ],
  },
  {
    title: "Security & Monitoring",
    items: [
      {
        title: "Alerts",
        href: "/admin?tab=alerts",
        icon: Bell,
        color: "from-red-500 to-rose-600",
        badge: "New",
      },
      {
        title: "Audit Logs",
        href: "/admin?tab=audit-logs",
        icon: Shield,
        color: "from-slate-500 to-gray-600",
      },
      {
        title: "Security",
        href: "/admin?tab=security",
        icon: Shield,
        color: "from-blue-500 to-indigo-600",
      },
    ],
  },
];

const allNavItems = navSections.flatMap((section) => section.items);

type AdminSidebarProps = {
  userName: string;
  userEmail: string;
};

export default function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const activeTab = searchParams.get("tab") || "overview";

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position, doesn't move on scroll */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 shadow-2xl transition-transform duration-300 flex flex-col",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo/Brand Section */}
        <div className="border-b border-slate-700/50 p-5 bg-gradient-to-r from-slate-800 to-slate-900 lg:p-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-white">Admin</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Control Center</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navSections.map((section, sectionIndex) => {
            const isCollapsed = collapsedSections.has(section.title);
            return (
              <div key={section.title} className={sectionIndex > 0 ? "mt-6" : ""}>
                {/* Collapsible Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <span>{section.title}</span>
                  <ChevronDown className={cn(
                    "size-3 transition-transform duration-200",
                    isCollapsed && "transform -rotate-90"
                  )} />
                </button>

                {/* Section Items */}
                {!isCollapsed && section.items.map((item) => {
                  const itemTab = item.href.split("?tab=")[1] || "overview";
                  const isActive = pathname === "/admin" && activeTab === itemTab;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 mb-1",
                        isActive
                          ? `bg-gradient-to-r ${item.color} shadow-lg text-white`
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-white to-white/50" />
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all",
                          isActive
                            ? "bg-white/20 shadow-inner"
                            : "bg-slate-800 group-hover:bg-slate-700"
                        )}
                      >
                        <item.icon className="size-4" />
                      </div>

                      {/* Text and Badge */}
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-sm">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Hover glow effect */}
                      {!isActive && (
                        <div className={cn(
                          "absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
                          item.color.replace("from-", "from-").replace(" to-", "to-")
                        )} />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-4 border-t border-slate-700/50" />

          {/* Back to Dashboard Link */}
          <Link
            href="/dashboard"
            className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-all">
              <Home className="size-4" />
            </div>
            <span className="font-medium text-sm">Back to Dashboard</span>
          </Link>
        </nav>

        {/* Footer with User Dropdown */}
        <div className="border-t border-slate-700/50 p-3 bg-gradient-to-r from-slate-800 to-slate-900 lg:p-4">
          <AdminUserDropdown userName={userName} userEmail={userEmail} />
        </div>
      </aside>
    </>
  );
}
