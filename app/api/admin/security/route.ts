import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { checkFraud, getRateLimitStats } from "@/lib/services/rate-limit-service";
import UserModel from "@/models/user/User";

export const runtime = "nodejs";

// Helper: Verify admin access
async function verifyAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { authorized: false, error: "Unauthorized" };
  }

  await connectToDatabase();
  const userDoc = await UserModel.findById(user.id);

  if (!userDoc || userDoc.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin access required" };
  }

  return { authorized: true, user: userDoc };
}

// GET /api/admin/security - Get security statistics and rate limit info
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action"); // "stats" or "check-fraud"

    if (action === "stats") {
      // Get rate limit statistics
      const stats = getRateLimitStats();

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    if (action === "check-fraud") {
      // Check fraud for a specific user
      const userId = searchParams.get("userId");
      const ipAddress = searchParams.get("ipAddress") || "unknown";

      if (!userId) {
        return NextResponse.json(
          { message: "userId is required" },
          { status: 400 }
        );
      }

      const fraudResult = await checkFraud(userId, ipAddress);

      return NextResponse.json({
        success: true,
        userId,
        ipAddress,
        fraudCheck: fraudResult,
      });
    }

    return NextResponse.json(
      { message: "Invalid action. Use 'stats' or 'check-fraud'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in security check:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Security check failed" },
      { status: 500 }
    );
  }
}
