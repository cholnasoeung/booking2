"use client";

import { useEffect, useState, useCallback } from "react";
import { toastSuccess, toastError } from "@/lib/utils/swal";
import {
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RatingItem {
  id: string;
  rating: number;
  review: string | null;
  aspects: {
    punctuality: number;
    cleanliness: number;
    staffBehavior: number;
    comfort: number;
  };
  wouldRecommend: boolean;
  isVerified: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  bus: { id: string; busNumber: string | null; departureTime: string; date: string } | null;
}

interface RatingsResponse {
  ratings: RatingItem[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
};

function StarRow({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </span>
  );
}

export default function AdminRatingsManager() {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page) });
      const res = await fetch(`/api/admin/ratings?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const setStatus = async (rating: RatingItem, newStatus: "approved" | "rejected" | "pending") => {
    setPending((p) => ({ ...p, [rating.id]: true }));
    try {
      const res = await fetch(`/api/admin/ratings/${rating.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toastError(json.message ?? "Failed");
        return;
      }
      toastSuccess(`Rating ${newStatus}`);
      setData((prev) =>
        prev
          ? { ...prev, ratings: prev.ratings.filter((r) => r.id !== rating.id) }
          : prev
      );
    } catch {
      toastError("Request failed");
    } finally {
      setPending((p) => ({ ...p, [rating.id]: false }));
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rating Moderation</h2>
          <p className="text-sm text-gray-500">
            {data ? `${data.total} ${statusFilter} rating${data.total !== 1 ? "s" : ""}` : "Approve or reject user reviews"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchRatings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              statusFilter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-indigo-100 hover:border-indigo-300"
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Loading ratings…
        </div>
      ) : data?.ratings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-indigo-100 bg-white p-16 text-center">
          <Star className="mx-auto w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No {statusFilter} ratings</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === "pending"
              ? "All ratings have been moderated."
              : `No ratings with ${statusFilter} status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.ratings.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-indigo-50/40 gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-bold">
                    {r.user?.name.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.user?.name ?? "Unknown user"}</p>
                      <span className="text-xs text-gray-400">{r.user?.email}</span>
                      {r.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified trip
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <StarRow value={r.rating} />
                      <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                      {r.bus && (
                        <span className="text-xs text-gray-400">
                          Bus {r.bus.busNumber ?? r.bus.id.slice(-6)} · {r.bus.departureTime} · {formatDate(r.bus.date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CONFIG[r.status].cls}`}
                >
                  {STATUS_CONFIG[r.status].label}
                </span>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                {/* Review text */}
                {r.review ? (
                  <div className="flex gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 leading-relaxed">{r.review}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No written review.</p>
                )}

                {/* Aspect scores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      ["Punctuality", r.aspects.punctuality],
                      ["Cleanliness", r.aspects.cleanliness],
                      ["Staff", r.aspects.staffBehavior],
                      ["Comfort", r.aspects.comfort],
                    ] as [string, number][]
                  ).map(([label, val]) => (
                    <div key={label} className="rounded-xl bg-indigo-50/40 border border-gray-100 px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <StarRow value={val} />
                    </div>
                  ))}
                </div>

                {/* Would recommend */}
                <div className="flex items-center gap-1.5 text-sm">
                  <ThumbsUp
                    className={`w-4 h-4 ${r.wouldRecommend ? "text-emerald-500" : "text-gray-300"}`}
                  />
                  <span className={r.wouldRecommend ? "text-emerald-600" : "text-gray-400"}>
                    {r.wouldRecommend ? "Would recommend" : "Would not recommend"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-100 bg-indigo-50/40 flex items-center gap-3 flex-wrap">
                {r.status !== "approved" && (
                  <button
                    onClick={() => setStatus(r, "approved")}
                    disabled={pending[r.id]}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {pending[r.id] ? "Saving…" : "Approve"}
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(r, "rejected")}
                    disabled={pending[r.id]}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {pending[r.id] ? "Saving…" : "Reject"}
                  </button>
                )}
                {r.status !== "pending" && (
                  <button
                    onClick={() => setStatus(r, "pending")}
                    disabled={pending[r.id]}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    Reset to pending
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-xs text-gray-500">
                Page <span className="font-semibold">{data.page}</span> of{" "}
                <span className="font-semibold">{data.totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-full p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 rounded-full p-0"
                  disabled={page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
