import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Star, Trophy, Gift, Zap, ArrowLeft, Shield,
  XCircle, CheckCircle2, TrendingUp, Bus, Ticket,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { requireUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import LoyaltyModel, { LOYALTY_TIERS, type LoyaltyTier } from "@/models/Loyalty";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<LoyaltyTier, { label: string; color: string; gradient: string; ring: string; icon: React.ElementType; minPoints: number }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",  gradient: "from-amber-500  to-orange-600", ring: "ring-amber-300",   icon: Star,    minPoints: 0     },
  silver:   { label: "Silver",   color: "text-slate-600",  gradient: "from-slate-400  to-slate-600",  ring: "ring-slate-300",   icon: Shield,  minPoints: 1000  },
  gold:     { label: "Gold",     color: "text-yellow-600", gradient: "from-yellow-400 to-amber-500",  ring: "ring-yellow-300",  icon: Trophy,  minPoints: 5000  },
  platinum: { label: "Platinum", color: "text-violet-600", gradient: "from-violet-500 to-purple-700", ring: "ring-violet-300",  icon: Zap,     minPoints: 10000 },
};

const HISTORY_TYPE: Record<string, { label: string; color: string; sign: "+" | "-" }> = {
  earned:   { label: "Earned",   color: "text-emerald-600", sign: "+" },
  redeemed: { label: "Redeemed", color: "text-rose-600",    sign: "-" },
  expired:  { label: "Expired",  color: "text-slate-400",   sign: "-" },
  adjusted: { label: "Adjusted", color: "text-indigo-600",  sign: "+" },
};

export default async function LoyaltyPage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard%2Floyalty");

  await connectToDatabase();
  const loyalty = await LoyaltyModel.getOrCreate(user.id);

  const tiers = ["bronze", "silver", "gold", "platinum"] as LoyaltyTier[];
  const currentIndex    = tiers.indexOf(loyalty.tier);
  const nextTier        = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  const nextTierMinPts  = nextTier ? LOYALTY_TIERS[nextTier].points : null;
  const currentTierPts  = LOYALTY_TIERS[loyalty.tier].points;
  const progress        = nextTierMinPts
    ? Math.min(Math.round(((loyalty.lifetimePoints - currentTierPts) / (nextTierMinPts - currentTierPts)) * 100), 100)
    : 100;

  const history = [...loyalty.pointsHistory].reverse().slice(0, 10);

  const tier     = TIER_CONFIG[loyalty.tier];
  const TierIcon = tier.icon;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Back */}
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>

          {/* Hero — tier card */}
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.gradient} p-8 text-white shadow-2xl`}>
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 ring-4 ${tier.ring} shadow-inner`}>
                  <TierIcon className="h-10 w-10 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Loyalty Status</p>
                  <h1 className="mt-1 text-4xl font-black">{tier.label}</h1>
                  <p className="text-sm text-white/80 mt-1">{loyalty.lifetimePoints.toLocaleString()} lifetime points</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black">{loyalty.points.toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold text-white/70">Available Points</p>
                {loyalty.benefits.discounts > 0 && (
                  <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {loyalty.benefits.discounts}% discount on all bookings
                  </span>
                )}
              </div>
            </div>

            {nextTier && (
              <div className="relative mt-6 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-white/80">
                  <span>{tier.label} ({currentTierPts.toLocaleString()} pts)</span>
                  <span>{TIER_CONFIG[nextTier].label} ({nextTierMinPts?.toLocaleString()} pts)</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-white/70">
                  {progress}% to {TIER_CONFIG[nextTier].label} ·{" "}
                  {((nextTierMinPts ?? 0) - loyalty.lifetimePoints).toLocaleString()} more points needed
                </p>
              </div>
            )}
            {!nextTier && (
              <div className="relative mt-4 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold">
                🎉 You have reached the highest tier — Platinum!
              </div>
            )}
          </div>

          {/* KPI stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Available Points", value: loyalty.points.toLocaleString(),        icon: Star,       bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-200" },
              { label: "Lifetime Points",  value: loyalty.lifetimePoints.toLocaleString(),icon: TrendingUp, bg: "bg-indigo-50",  text: "text-indigo-600", border: "border-indigo-200" },
              { label: "Total Bookings",   value: loyalty.totalBookings.toString(),        icon: Ticket,     bg: "bg-emerald-50", text: "text-emerald-600",border: "border-emerald-200" },
              { label: "Total Spent",      value: `$${loyalty.totalSpent.toFixed(2)}`,    icon: Bus,        bg: "bg-violet-50",  text: "text-violet-600", border: "border-violet-200" },
            ].map(({ label, value, icon: Icon, bg, text, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 shadow-sm`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-4 w-4 ${text}`} />
                </div>
                <p className="mt-3 text-2xl font-black text-slate-800">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Benefits */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                <Gift className="h-5 w-5 text-indigo-500" />
                Your {tier.label} Benefits
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Priority Support",        active: loyalty.benefits.prioritySupport       },
                  { label: "Seat Selection Priority",  active: loyalty.benefits.seatSelectionPriority },
                  { label: "Free Cancellation",        active: loyalty.benefits.freeCancellation      },
                  { label: "Extra Baggage Allowance",  active: loyalty.benefits.extraBaggage          },
                  { label: `${loyalty.benefits.discounts}% Booking Discount`, active: loyalty.benefits.discounts > 0 },
                ].map(({ label, active }) => (
                  <div key={label} className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                    active ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50 opacity-50"
                  )}>
                    {active
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      : <XCircle     className="h-4 w-4 shrink-0 text-slate-300" />}
                    <span className={active ? "font-medium text-slate-800" : "text-slate-400"}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier roadmap */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                <Trophy className="h-5 w-5 text-amber-500" />
                Tier Roadmap
              </h2>
              <div className="space-y-3">
                {tiers.map((t, i) => {
                  const cfg       = TIER_CONFIG[t];
                  const TIcon     = cfg.icon;
                  const isCurrent  = t === loyalty.tier;
                  const isUnlocked = tiers.indexOf(loyalty.tier) >= i;
                  return (
                    <div key={t} className={cn(
                      "flex items-center gap-3 rounded-xl border px-3.5 py-3",
                      isCurrent  ? `border-2 bg-gradient-to-r ${cfg.gradient} text-white shadow-md` :
                      isUnlocked ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-white opacity-50"
                    )}>
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isCurrent ? "bg-white/25" : "bg-slate-100"
                      )}>
                        <TIcon className={cn("h-4 w-4", isCurrent ? "text-white" : cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold text-sm", isCurrent ? "text-white" : "text-slate-800")}>
                          {cfg.label}{isCurrent && " ← You are here"}
                        </p>
                        <p className={cn("text-xs", isCurrent ? "text-white/70" : "text-slate-500")}>
                          {cfg.minPoints.toLocaleString()} lifetime points
                        </p>
                      </div>
                      {isUnlocked && !isCurrent && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Points history */}
          {history.length > 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Recent Points Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Date", "Description", "Type", "Points"].map(h => (
                        <th key={h} className="pb-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((h: any, i: number) => {
                      const ht = HISTORY_TYPE[h.type] ?? HISTORY_TYPE.adjusted;
                      return (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(h.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                          </td>
                          <td className="py-3 pr-4 text-slate-700 max-w-[200px] truncate">{h.description}</td>
                          <td className="py-3 pr-4">
                            <span className={cn("text-xs font-semibold", ht.color)}>{ht.label}</span>
                          </td>
                          <td className={cn("py-3 font-mono font-bold text-sm", ht.color)}>
                            {ht.sign}{Math.abs(h.points)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 py-12 text-center">
              <Star className="mx-auto h-10 w-10 text-indigo-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">No points activity yet</p>
              <p className="mt-1 text-xs text-slate-400">Book a trip to start earning loyalty points.</p>
              <Link href="/" className="mt-4 inline-block rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                Book a trip
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
