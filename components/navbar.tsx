import Link from "next/link";

import LanguageToggle from "@/components/language-toggle";
import LogoutButton from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

const navLinkClass =
  "rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-white/70 hover:text-foreground";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
              RM
            </div>
            <div>
              <p className="font-heading text-base font-semibold tracking-tight text-foreground">
                RedMiles Cambodia
              </p>
              <p className="text-xs text-muted-foreground">
                Bus tickets with live seat maps
              </p>
            </div>
          </Link>
          {user?.role === "admin" ? (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Admin access
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/support" className={navLinkClass}>
            Support
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className={navLinkClass}>
                My Bookings
              </Link>
              <Link href="/dashboard/profile" className={navLinkClass}>
                Profile
              </Link>
            </>
          ) : null}
          {user?.role === "admin" ? (
            <Link href="/admin" className={navLinkClass}>
              Admin
            </Link>
          ) : null}

          <LanguageToggle />
          <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-2">
            {user ? (
              <>
                <div className="rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Signed in as </span>
                  <span className="font-medium text-foreground">{user.name}</span>
                </div>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
