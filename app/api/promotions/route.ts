import { connectToDatabase } from "@/lib/db/mongodb";
import PromoCodeModel from "@/models/commerce/PromoCode";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const now = new Date();

    const promotions = await PromoCodeModel.find({
      isActive:   true,
      validFrom:  { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { maxUses: null },
        { $expr: { $lt: ["$usedCount", "$maxUses"] } },
      ],
    })
      .select("code type value title imageUrl validUntil minBookingAmount")
      .sort({ validUntil: 1 })
      .limit(5)
      .lean();

    return Response.json({ promotions });
  } catch (err) {
    console.error("[promotions] GET error:", err);
    return Response.json({ promotions: [] });
  }
}
