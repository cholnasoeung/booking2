"use client";

import { useEffect, useState } from "react";
import { Award, Star, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LoyaltyData = {
  tier: "bronze" | "silver" | "gold" | "platinum";
  points: number;
  lifetimePoints: number;
  totalBookings: number;
  totalSpent: number;
  benefits: {
    prioritySupport: boolean;
    seatSelectionPriority: boolean;
    freeCancellation: boolean;
    extraBaggage: boolean;
    discounts: number;
  };
  nextTier: string | null;
  nextTierMinPoints: number | null;
  progressToNextTier: number;
  pointsHistory: Array<{
    points: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  bronze: { bg: "from-amber-700 to-amber-500", text: "text-amber-900", border: "border-amber-300", badge: "bg-amber-100 text-amber-800" },
  silver: { bg: "from-slate-500 to-slate-400", text: "text-slate-900", border: "border-slate-300", badge: "bg-slate-100 text-slate-800" },
  gold:   { bg: "from-yellow-500 to-yellow-400", text: "text-yellow-900", border: "border-yellow-300", badge: "bg-yellow-100 text-yellow-800" },
  platinum: { bg: "from-indigo-600 to-purple-500", text: "text-indigo-900", border: "border-indigo-300", badge: "bg-indigo-100 text-indigo-800" },
};

export default function LoyaltyCard() {
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/loyalty")
      .then((r) => r.json())
      .then((data) => {
        if (!data.message) setLoyalty(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-slate-200 animate-pulse">
        <CardContent className="h-40" />
      </Card>
    );
  }

  if (!loyalty) return null;

  const colors = TIER_COLORS[loyalty.tier];

  return (
    <Card className={`border ${colors.border} overflow-hidden`}>
      {/* Tier banner */}
      <div className={`bg-gradient-to-r ${colors.bg} px-6 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Loyalty Tier</p>
              <p className="text-2xl font-bold capitalize">{loyalty.tier}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-80">Points</p>
            <p className="text-3xl font-bold">{loyalty.points.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 pt-5">
        {/* Progress to next tier */}
        {loyalty.nextTier && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Progress to <span className="font-medium capitalize">{loyalty.nextTier}</span></span>
              <span className="font-medium text-slate-700">{loyalty.progressToNextTier}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${colors.bg} transition-all duration-500`}
                style={{ width: `${loyalty.progressToNextTier}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {loyalty.nextTierMinPoints
                ? `${(loyalty.nextTierMinPoints - loyalty.lifetimePoints).toLocaleString()} lifetime points to go`
                : ""}
            </p>
          </div>
        )}
        {!loyalty.nextTier && (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3">
            <Star className="h-4 w-4 fill-indigo-500 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-700">Maximum tier reached — enjoy all benefits!</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xl font-bold text-slate-900">{loyalty.totalBookings}</p>
            <p className="text-xs text-slate-500">Trips</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xl font-bold text-slate-900">{loyalty.lifetimePoints.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Lifetime pts</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xl font-bold text-slate-900">{loyalty.benefits.discounts}%</p>
            <p className="text-xs text-slate-500">Discount</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your Benefits</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "prioritySupport", label: "Priority Support" },
              { key: "seatSelectionPriority", label: "Seat Priority" },
              { key: "freeCancellation", label: "Free Cancellation" },
              { key: "extraBaggage", label: "Extra Baggage" },
            ].map(({ key, label }) => (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  loyalty.benefits[key as keyof typeof loyalty.benefits]
                    ? "bg-green-50 text-green-700"
                    : "bg-slate-50 text-slate-400 line-through"
                }`}
              >
                <CheckCircle className={`h-3.5 w-3.5 ${loyalty.benefits[key as keyof typeof loyalty.benefits] ? "text-green-500" : "text-slate-300"}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Recent points history */}
        {loyalty.pointsHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recent Activity</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {loyalty.pointsHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 truncate">{entry.description}</span>
                  <span className={`font-semibold ml-2 shrink-0 ${entry.points >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {entry.points >= 0 ? "+" : ""}{entry.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
