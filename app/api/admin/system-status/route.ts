import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSystemStatus } from "@/lib/health-service";
import UserModel from "@/models/User";

export const runtime = "nodejs";

// Helper: Verify admin access
async function verifyAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { authorized: false, error: "Unauthorized" };
  }

  const userDoc = await UserModel.findById(user.id);

  if (!userDoc || userDoc.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin access required" };
  }

  return { authorized: true, user: userDoc };
}

// GET /api/admin/system-status - Get detailed system status
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

    const status = await getSystemStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching system status:", error);

    return NextResponse.json(
      {
        status: "down",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to fetch system status",
      },
      { status: 503 }
    );
  }
}
