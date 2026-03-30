"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { User, LogOut, Settings, ChevronDown, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminUserDropdownProps = {
  userName: string;
  userEmail: string;
};

export default function AdminUserDropdown({
  userName,
  userEmail,
}: AdminUserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  function handleMenuClick(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="relative z-50">
      {/* User Button - Compact for Sidebar */}
      <button
        ref={buttonRef}
        type="button"
        className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-600/20 border border-indigo-400/30 px-3 py-2.5 hover:bg-gradient-to-r hover:from-indigo-500/30 hover:to-purple-600/30 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-sm shadow-lg shrink-0">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-white truncate leading-tight">
            {userName}
          </p>
          <p className="text-[10px] text-indigo-200 truncate flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" />
            Admin
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-indigo-200 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 mt-2 w-full rounded-xl bg-slate-800 border border-slate-600/50 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {/* User Info */}
            <div className="px-3 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold shadow-lg shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700/50 transition-all duration-150"
                onClick={() => handleMenuClick(() => {
                  window.location.href = "/dashboard/profile";
                })}
              >
                <User className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700/50 transition-all duration-150"
                onClick={() => handleMenuClick(() => {
                  // Settings functionality can be added later
                })}
              >
                <Settings className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Settings</span>
              </button>
            </div>

            {/* Logout Button */}
            <div className="border-t border-slate-700/50 pt-1 mt-1">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all duration-150 rounded-lg mx-1"
                onClick={() => handleMenuClick(() => signOut({ callbackUrl: "/" }))}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
