"use client";

import { useState } from "react";
import { BellRing, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  busId: string;
  routeId: string;
  date: string;
  departureTime: string;
  requestedSeats: number;
};

export default function JoinWaitlistButton({
  busId,
  routeId,
  date,
  departureTime,
  requestedSeats,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "joined" | "already" | "error">("idle");
  const [position, setPosition] = useState<number | null>(null);

  async function handleJoin() {
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId, routeId, date, departureTime, requestedSeats }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosition(data.entry?.position ?? null);
        setStatus("joined");
      } else if (res.status === 400 && data.message?.includes("already")) {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "joined") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
        <div>
          <p className="font-medium text-green-800">You&apos;re on the waitlist!</p>
          {position !== null && (
            <p className="text-sm text-green-600">Queue position #{position}</p>
          )}
          <p className="text-xs text-green-500 mt-0.5">We&apos;ll notify you when a seat becomes available.</p>
        </div>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <BellRing className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">You are already on the waitlist for this bus.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <BellRing className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">This bus is fully booked</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Join the waitlist and we&apos;ll notify you if a seat opens up.
          </p>
        </div>
      </div>
      <Button
        onClick={handleJoin}
        disabled={status === "loading"}
        className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
      >
        {status === "loading" ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Joining…</>
        ) : (
          <><BellRing className="h-4 w-4 mr-2" /> Join Waitlist</>
        )}
      </Button>
      {status === "error" && (
        <p className="text-xs text-red-600 text-center">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
