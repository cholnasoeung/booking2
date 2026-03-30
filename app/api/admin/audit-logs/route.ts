import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuditLogs } from "@/lib/audit-service";
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

// GET /api/admin/audit-logs - Get audit logs with filtering
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

    // Parse query parameters
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 100;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!, 10)
      : 0;

    // Validate limit
    if (limit > 1000) {
      return NextResponse.json(
        { message: "Limit cannot exceed 1000" },
        { status: 400 }
      );
    }

    // Get audit logs
    const { logs, total } = await getAuditLogs({
      entityType: entityType as any,
      entityId,
      userId,
      action: action as any,
      severity: severity as any,
      startDate,
      endDate,
      limit,
      skip,
    });

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      skip,
      hasMore: skip + logs.length < total,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
