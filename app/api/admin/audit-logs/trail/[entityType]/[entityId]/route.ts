import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getEntityAuditTrail } from "@/lib/audit-service";
import UserModel from "@/models/User";

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

// GET /api/admin/audit-logs/trail/:entityType/:entityId - Get audit trail for specific entity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    // Verify admin access
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const { entityType, entityId } = await params;

    // Validate entityType
    const validEntityTypes = ["booking", "bus", "route", "user", "promo_code", "system"];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { message: `Invalid entity type. Must be one of: ${validEntityTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get audit trail
    const logs = await getEntityAuditTrail(entityType as any, entityId);

    return NextResponse.json({
      success: true,
      entityType,
      entityId,
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch audit trail" },
      { status: 500 }
    );
  }
}
