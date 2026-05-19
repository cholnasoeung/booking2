"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RatingEntry = {
  _id: string;
  rating: number;
  review?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  wouldRecommend: boolean;
  aspects?: { punctuality: number; cleanliness: number; staffBehavior: number; comfort: number };
  user?: { name: string; email: string };
};

export default function AdminRatingsTab() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/ratings?status=${filter}`)
      .then((r) => r.json())
      .then((data) => {
        setRatings(data.ratings ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleAction(ratingId: string, action: "approve" | "reject") {
    setActing(ratingId);
    try {
      const res = await fetch("/api/admin/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratingId, action }),
      });
      if (res.ok) {
        setRatings((prev) => prev.filter((r) => r._id !== ratingId));
        setTotal((t) => t - 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reviews &amp; Ratings</h2>
          <p className="text-sm text-gray-500">{total} {filter} review{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : ratings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <p className="text-3xl mb-3">★</p>
            <p className="font-medium">No {filter} reviews</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ratings.map((r) => (
            <Card key={r._id} className="border-gray-200">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 font-mono text-sm">
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{r.rating}/5</span>
                      {r.wouldRecommend && (
                        <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700">Recommends</Badge>
                      )}
                    </div>
                    {r.user && (
                      <p className="text-xs text-gray-500">{r.user.name} · {r.user.email}</p>
                    )}
                    <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  {filter === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs"
                        disabled={acting === r._id}
                        onClick={() => handleAction(r._id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full border-red-200 text-red-700 hover:bg-red-50 text-xs"
                        disabled={acting === r._id}
                        onClick={() => handleAction(r._id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {r.review && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{r.review}</p>
                )}

                {r.aspects && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 sm:grid-cols-4">
                    {Object.entries(r.aspects).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between gap-1">
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-medium text-gray-700">{val}/5</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
