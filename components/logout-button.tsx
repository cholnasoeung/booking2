"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-full border-white/70 bg-white/80 px-4 text-sm"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Logout
    </Button>
  );
}
