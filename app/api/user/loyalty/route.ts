import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import LoyaltyModel, { LOYALTY_TIERS } from "@/models/Loyalty";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in." }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const loyalty = await LoyaltyModel.getOrCreate(session.user.id);

    const recentHistory = loyalty.pointsHistory
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((h) => ({
        points: h.points,
        type: h.type,
        description: h.description,
        createdAt: h.createdAt.toISOString(),
      }));

    return Response.json({
      tier: loyalty.tier,
      points: loyalty.points,
      lifetimePoints: loyalty.lifetimePoints,
      totalBookings: loyalty.totalBookings,
      totalSpent: loyalty.totalSpent,
      benefits: loyalty.benefits,
      tierProgress: loyalty.tierProgress,
      tierConfig: LOYALTY_TIERS,
      pointsHistory: recentHistory,
      lastActivityAt: loyalty.metadata.lastActivityAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Loyalty fetch error:", error);
    return Response.json(
      { message: "Unable to load loyalty data." },
      { status: 500 }
    );
  }
}
