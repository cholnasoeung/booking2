"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type WaitlistEntry = {
  id: string;
  status: "active" | "notified";
  requestedSeats: number;
  requestedDate: string;
  requestedDepartureTime: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string;
  bus: {
    id: string;
    from: string;
    to: string;
    departureTime: string;
    date: string;
  } | null;
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/waitlist")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleLeave(entryId: string) {
    setRemoving(entryId);
    try {
      const res = await fetch(`/api/waitlist?id=${entryId}`, { method: "DELETE" });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">My Waitlist</h1>
          <p className="mt-1 text-sm text-slate-500">Buses you are waiting for seats on.</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-white/60 bg-white/90 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-4">🔔</p>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No waitlist entries</h3>
            <p className="text-sm text-slate-500 mb-6">
              When a bus is fully booked, you can join its waitlist to be notified when seats open up.
            </p>
            <Link
              href="/"
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Search buses
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-white/60 bg-white/90 shadow-xl">
              <CardContent className="grid gap-4 py-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-lg font-semibold text-slate-900">
                      {entry.bus ? `${entry.bus.from} → ${entry.bus.to}` : "Bus no longer available"}
                    </p>
                    <Badge
                      variant={entry.status === "notified" ? "secondary" : "outline"}
                      className={entry.status === "notified" ? "bg-amber-100 text-amber-700 border-amber-200" : ""}
                    >
                      {entry.status === "notified" ? "🔔 Notified" : "Waiting"}
                    </Badge>
                  </div>

                  {entry.bus && (
                    <p className="text-sm text-slate-500">
                      {new Date(entry.bus.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      {" "}· Departs {entry.bus.departureTime}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>{entry.requestedSeats} seat{entry.requestedSeats > 1 ? "s" : ""} requested</span>
                    <span>Joined {new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span>Expires {new Date(entry.expiresAt).toLocaleDateString()}</span>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-slate-400">Note: {entry.notes}</p>
                  )}
                </div>

                <div className="flex items-start gap-2 sm:flex-col sm:items-end">
                  {entry.bus && entry.status === "notified" && (
                    <Link
                      href={`/book/${entry.bus.id}?passengers=${entry.requestedSeats}`}
                      className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Book now
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-red-200 text-red-700 hover:bg-red-50 text-xs"
                    disabled={removing === entry.id}
                    onClick={() => handleLeave(entry.id)}
                  >
                    {removing === entry.id ? "Leaving…" : "Leave waitlist"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
