import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  checkAllAlerts,
  runAlertCheck,
  DEFAULT_ALERT_CONFIG,
  type AlertConfig,
} from "@/lib/alert-service";
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

// GET /api/admin/alerts - Get current alerts
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
    const runCheck = searchParams.get("run") === "true";

    // Get alert configuration from query params (optional)
    const config: AlertConfig = {
      lowInventoryThreshold: searchParams.get("lowInventoryThreshold")
        ? parseInt(searchParams.get("lowInventoryThreshold")!, 10)
        : DEFAULT_ALERT_CONFIG.lowInventoryThreshold,
      overbookingThreshold: searchParams.get("overbookingThreshold")
        ? parseInt(searchParams.get("overbookingThreshold")!, 10)
        : DEFAULT_ALERT_CONFIG.overbookingThreshold,
      cancellationSpikeThreshold: searchParams.get("cancellationSpikeThreshold")
        ? parseInt(searchParams.get("cancellationSpikeThreshold")!, 10)
        : DEFAULT_ALERT_CONFIG.cancellationSpikeThreshold,
      revenueDropThreshold: searchParams.get("revenueDropThreshold")
        ? parseInt(searchParams.get("revenueDropThreshold")!, 10)
        : DEFAULT_ALERT_CONFIG.revenueDropThreshold,
    };

    // Run alert check
    const result = runCheck
      ? await runAlertCheck(config)
      : await checkAllAlerts(config);

    return NextResponse.json({
      success: true,
      ...result,
      config,
    });
  } catch (error) {
    console.error("Error checking alerts:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to check alerts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/alerts/check - Manually trigger alert check and send notifications
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const body = await request.json();
    const config: AlertConfig = {
      lowInventoryThreshold:
        body.lowInventoryThreshold ?? DEFAULT_ALERT_CONFIG.lowInventoryThreshold,
      overbookingThreshold:
        body.overbookingThreshold ?? DEFAULT_ALERT_CONFIG.overbookingThreshold,
      cancellationSpikeThreshold:
        body.cancellationSpikeThreshold ??
        DEFAULT_ALERT_CONFIG.cancellationSpikeThreshold,
      revenueDropThreshold:
        body.revenueDropThreshold ?? DEFAULT_ALERT_CONFIG.revenueDropThreshold,
    };

    // Run alert check with notifications
    const result = await runAlertCheck(config);

    return NextResponse.json({
      success: true,
      message: "Alert check completed",
      ...result,
    });
  } catch (error) {
    console.error("Error running alert check:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to run alert check" },
      { status: 500 }
    );
  }
}
