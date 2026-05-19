import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";
import LoyaltyModel from "@/models/Loyalty";

export const runtime = "nodejs";

function generateCode(name: string): string {
  const base = name.replace(/\s+/g, "").slice(0, 6).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

// GET: get or create referral code + referral stats
export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    let user = await UserModel.findById(session.user.id).lean();
    if (!user) return Response.json({ message: "User not found" }, { status: 404 });

    // Auto-create referral code if missing
    if (!(user as any).referralCode) {
      let code = generateCode((user as any).name || "USER");
      // Ensure uniqueness
      while (await UserModel.exists({ referralCode: code })) {
        code = generateCode((user as any).name || "USER");
      }
      await UserModel.findByIdAndUpdate(session.user.id, { referralCode: code });
      user = { ...(user as any), referralCode: code };
    }

    const referralCode = (user as any).referralCode as string;

    // Count referrals
    const referredCount = await UserModel.countDocuments({ referredBy: session.user.id });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const referralLink = `${baseUrl}/register?ref=${referralCode}`;

    return Response.json({ referralCode, referralLink, referredCount });
  } catch (error) {
    console.error("Referral GET error:", error);
    return Response.json({ message: "Unable to fetch referral info" }, { status: 500 });
  }
}

// POST: validate a referral code at registration and award points
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const newUserId = typeof body?.newUserId === "string" ? body.newUserId : "";

    if (!code || !newUserId) {
      return Response.json({ message: "Missing code or user ID" }, { status: 400 });
    }

    await connectToDatabase();

    const referrer = await UserModel.findOne({ referralCode: code });
    if (!referrer) {
      return Response.json({ message: "Invalid referral code" }, { status: 404 });
    }

    // Link new user to referrer
    await UserModel.findByIdAndUpdate(newUserId, { referredBy: referrer._id });

    // Award loyalty points to referrer (50 pts)
    const loyalty = await LoyaltyModel.getOrCreate(String(referrer._id));
    await loyalty.addPoints(50, "Referral bonus — friend signed up");

    return Response.json({ message: "Referral applied", referrerId: String(referrer._id) });
  } catch (error) {
    console.error("Referral POST error:", error);
    return Response.json({ message: "Unable to apply referral" }, { status: 500 });
  }
}
