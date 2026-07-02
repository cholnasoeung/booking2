import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import LoyaltyModel, { LOYALTY_TIERS } from "@/models/commerce/Loyalty";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const loyalty = await LoyaltyModel.getOrCreate(session.user.id);

    const tiers = ["bronze", "silver", "gold", "platinum"] as const;
    const currentIndex = tiers.indexOf(loyalty.tier);
    const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
    const currentTierMinPoints = LOYALTY_TIERS[loyalty.tier].points;
    const nextTierMinPoints = nextTier ? LOYALTY_TIERS[nextTier].points : null;
    const progressToNextTier = nextTierMinPoints
      ? Math.min(
          Math.round(((loyalty.lifetimePoints - currentTierMinPoints) / (nextTierMinPoints - currentTierMinPoints)) * 100),
          100
        )
      : 100;

    return Response.json({
      tier: loyalty.tier,
      points: loyalty.points,
      lifetimePoints: loyalty.lifetimePoints,
      totalBookings: loyalty.totalBookings,
      totalSpent: loyalty.totalSpent,
      benefits: loyalty.benefits,
      nextTier,
      nextTierMinPoints,
      progressToNextTier,
      pointsHistory: loyalty.pointsHistory.slice(-10).reverse(),
    });
  } catch (error) {
    console.error("Error fetching loyalty:", error);
    return Response.json({ message: "Unable to fetch loyalty data" }, { status: 500 });
  }
}
