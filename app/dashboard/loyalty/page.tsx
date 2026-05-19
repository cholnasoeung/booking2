import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatters";
import { LOYALTY_TIERS, type LoyaltyTier } from "@/models/Loyalty";

type LoyaltyData = {
  tier: LoyaltyTier;
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
  tierProgress: {
    currentTierPoints: number;
    nextTierPoints: number;
    nextTier: LoyaltyTier | null;
  };
  pointsHistory: Array<{
    points: number;
    type: "earned" | "redeemed" | "expired" | "adjusted";
    description: string;
    createdAt: string;
  }>;
  lastActivityAt: string | null;
};

const TIER_STYLES: Record<
  LoyaltyTier,
  { color: string; bg: string; border: string; badge: string; icon: string }
> = {
  bronze: {
    color: "text-amber-800",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: "🥉",
  },
  silver: {
    color: "text-slate-700",
    bg: "from-slate-50 to-gray-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    icon: "🥈",
  },
  gold: {
    color: "text-yellow-800",
    bg: "from-yellow-50 to-amber-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "🥇",
  },
  platinum: {
    color: "text-indigo-800",
    bg: "from-indigo-50 to-purple-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800",
    icon: "💎",
  },
};

const HISTORY_ICONS: Record<string, string> = {
  earned: "↑",
  redeemed: "↓",
  expired: "⊘",
  adjusted: "⟳",
};

const HISTORY_COLORS: Record<string, string> = {
  earned: "text-emerald-700",
  redeemed: "text-amber-700",
  expired: "text-slate-500",
  adjusted: "text-indigo-700",
};

async function getLoyaltyData(): Promise<LoyaltyData | null> {
  try {
    const { connectToDatabase } = await import("@/lib/mongodb");
    const { getCurrentSession } = await import("@/lib/auth");
    const LoyaltyModelImport = (await import("@/models/Loyalty")).default;

    await connectToDatabase();
    const session = await getCurrentSession();
    if (!session?.user?.id) return null;

    const loyalty = await LoyaltyModelImport.getOrCreate(session.user.id);

    const recentHistory = loyalty.pointsHistory
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 20)
      .map((h) => ({
        points: h.points,
        type: h.type,
        description: h.description,
        createdAt: h.createdAt.toISOString(),
      }));

    return {
      tier: loyalty.tier,
      points: loyalty.points,
      lifetimePoints: loyalty.lifetimePoints,
      totalBookings: loyalty.totalBookings,
      totalSpent: loyalty.totalSpent,
      benefits: loyalty.benefits,
      tierProgress: loyalty.tierProgress,
      pointsHistory: recentHistory,
      lastActivityAt: loyalty.metadata.lastActivityAt?.toISOString() ?? null,
    };
  } catch {
    return null;
  }
}

export default async function LoyaltyPage() {
  await requireUser("/login?callbackUrl=%2Fdashboard%2Floyalty");
  const data = await getLoyaltyData();

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center text-muted-foreground">
          Unable to load loyalty data. Please try again later.
        </div>
      </>
    );
  }

  const style = TIER_STYLES[data.tier];
  const tierConfig = LOYALTY_TIERS[data.tier];
  const progressPct =
    data.tierProgress.nextTier && data.tierProgress.nextTierPoints > 0
      ? Math.min(
          100,
          Math.round(
            (data.tierProgress.currentTierPoints /
              (data.tierProgress.nextTierPoints -
                LOYALTY_TIERS[data.tier].points)) *
              100
          )
        )
      : 100;

  const benefitsList = [
    {
      key: "discounts",
      label: `${data.benefits.discounts}% discount on bookings`,
      active: data.benefits.discounts > 0,
    },
    {
      key: "prioritySupport",
      label: "Priority customer support",
      active: data.benefits.prioritySupport,
    },
    {
      key: "seatSelectionPriority",
      label: "Early seat selection access",
      active: data.benefits.seatSelectionPriority,
    },
    {
      key: "freeCancellation",
      label: "Free cancellation (no fee)",
      active: data.benefits.freeCancellation,
    },
    {
      key: "extraBaggage",
      label: "Extra baggage allowance",
      active: data.benefits.extraBaggage,
    },
  ];

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my bookings
        </Link>

        {/* Hero tier card */}
        <div
          className={`rounded-[32px] border ${style.border} bg-gradient-to-br ${style.bg} p-6 shadow-xl`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Your loyalty tier
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-4xl">{style.icon}</span>
                <h1 className={`font-heading text-4xl font-semibold ${style.color}`}>
                  {tierConfig.name}
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Available points
              </p>
              <p className={`mt-1 font-heading text-5xl font-bold ${style.color}`}>
                {data.points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.lifetimePoints.toLocaleString()} lifetime pts
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {data.tierProgress.nextTier ? (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>{tierConfig.name}</span>
                <span>
                  {data.tierProgress.nextTierPoints.toLocaleString()} pts →{" "}
                  <span className="font-semibold capitalize">
                    {data.tierProgress.nextTier}
                  </span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/60">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {Math.max(
                  0,
                  data.tierProgress.nextTierPoints - data.lifetimePoints
                ).toLocaleString()}{" "}
                points to reach {data.tierProgress.nextTier}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <Badge className={`${style.badge} rounded-full px-3 py-1 text-xs font-semibold`}>
                Maximum tier reached
              </Badge>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total bookings", value: data.totalBookings },
            { label: "Total spent", value: formatCurrency(data.totalSpent) },
            { label: "Lifetime points", value: data.lifetimePoints.toLocaleString() },
          ].map(({ label, value }) => (
            <Card
              key={label}
              className="border-white/60 bg-white/90 shadow-md"
            >
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Benefits */}
          <Card className="border-white/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle>Your benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {benefitsList.map(({ key, label, active }) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    active ? "bg-emerald-50" : "bg-slate-50 opacity-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-300 text-white"
                    }`}
                  >
                    {active ? "✓" : "×"}
                  </span>
                  <span
                    className={`text-sm ${
                      active ? "text-emerald-800 font-medium" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}

              {/* Tier requirements */}
              <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Tier requirements
                </p>
                {(["bronze", "silver", "gold", "platinum"] as LoyaltyTier[]).map(
                  (tier) => (
                    <div
                      key={tier}
                      className={`flex items-center justify-between text-xs ${
                        tier === data.tier
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="capitalize">
                        {TIER_STYLES[tier].icon} {tier}
                      </span>
                      <span>
                        {LOYALTY_TIERS[tier].points.toLocaleString()} pts
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Points history */}
          <Card className="border-white/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle>Points history</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pointsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Book your first trip to start earning points!
                </p>
              ) : (
                <div className="space-y-2">
                  {data.pointsHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-base font-bold ${HISTORY_COLORS[item.type]}`}
                        >
                          {HISTORY_ICONS[item.type]}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${HISTORY_COLORS[item.type]}`}
                      >
                        {item.points >= 0 ? "+" : ""}
                        {item.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
