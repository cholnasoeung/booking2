"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-150 shadow-sm"
    >
      <LogOut className="size-3.5" />
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}
