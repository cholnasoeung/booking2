import Link from "next/link";
import { Shield, LogIn, UserPlus, Ticket } from "lucide-react";

import LanguageToggle from "@/components/language-toggle";
import LogoutButton from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export default async function Navbar() {
  const user = await getCurrentUser();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p: string) => p[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40">
      {/* Gradient accent line */}
      <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="bg-white/92 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-900/[0.04]">
        <div className="mx-auto flex h-[62px] w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[13px] font-black text-white shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-200 select-none">
              RM
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-[14px] font-bold tracking-tight text-slate-900">RedMiles Cambodia</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bus tickets with live seat maps</p>
            </div>
          </Link>

          {/* ── Centre nav ── */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/support">Support</NavLink>
            {user && (
              <>
                <NavLink href="/dashboard">
                  <Ticket className="size-3.5" />
                  My Bookings
                </NavLink>
                <NavLink href="/dashboard/profile">Profile</NavLink>
              </>
            )}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-150"
              >
                <Shield className="size-3.5" />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* ── Right: lang + user ── */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />

            {user ? (
              <div className="flex items-center gap-2">
                {/* User chip */}
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 pl-1.5 pr-3 py-1 shadow-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow shadow-indigo-500/30 shrink-0">
                    {initials}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 max-w-[130px] truncate leading-none">
                    {user.name}
                  </span>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  <LogIn className="size-3.5" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 hover:shadow-indigo-500/40 transition-all duration-200"
                >
                  <UserPlus className="size-3.5" />
                  <span className="hidden sm:inline">Register</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-150"
    >
      {children}
    </Link>
  );
}
