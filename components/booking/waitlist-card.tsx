"use client";

import { useEffect, useState } from "react";
import { BellRing, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WaitlistEntry = {
  id: string;
  busId: string;
  routeFrom: string;
  routeTo: string;
  departureTime: string;
  requestedDate: string;
  requestedSeats: number;
  status: "active" | "notified";
  notifiedAt: string | null;
  notificationExpiresAt: string | null;
  createdAt: string;
};

export default function WaitlistCard() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/waitlist/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) setEntries(data.entries);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleLeave(entryId: string) {
    setRemoving(entryId);
    try {
      const res = await fetch(`/api/waitlist?id=${entryId}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-200 animate-pulse">
        <CardContent className="h-24" />
      </Card>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <BellRing className="h-4 w-4" />
          Waitlisted Buses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3">
            <div className="space-y-1">
              <p className="font-medium text-sm text-slate-900">
                {entry.routeFrom} → {entry.routeTo}
              </p>
              <p className="text-xs text-slate-500">
                {entry.requestedDate} · {entry.departureTime} · {entry.requestedSeats} seat{entry.requestedSeats > 1 ? "s" : ""}
              </p>
              {entry.status === "notified" && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  Seat available — book now!
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500"
              onClick={() => handleLeave(entry.id)}
              disabled={removing === entry.id}
            >
              {removing === entry.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
