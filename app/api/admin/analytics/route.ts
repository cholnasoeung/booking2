import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getRevenueMetrics,
  getKPIs,
  getRoutePerformance,
  getOccupancyReport,
  getBookingTrends,
} from "@/lib/analytics-service";
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

// GET /api/admin/analytics - Get analytics data
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
    const type = searchParams.get("type") || "kpi";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const previousStartDate = searchParams.get("previousStartDate");
    const previousEndDate = searchParams.get("previousEndDate");
    const months = searchParams.get("months");

    // Parse date ranges
    let currentRange, previousRange;

    if (startDate && endDate) {
      currentRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      currentRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };
    }

    if (previousStartDate && previousEndDate) {
      previousRange = {
        startDate: new Date(previousStartDate),
        endDate: new Date(previousEndDate),
      };
    } else {
      // Default to previous period of same length
      const diff =
        currentRange.endDate.getTime() - currentRange.startDate.getTime();
      previousRange = {
        startDate: new Date(currentRange.startDate.getTime() - diff),
        endDate: new Date(currentRange.endDate.getTime() - diff),
      };
    }

    // Route to appropriate analytics function
    switch (type) {
      case "kpi": {
        const kpis = await getKPIs(currentRange, previousRange);
        return NextResponse.json({ kpis });
      }

      case "revenue": {
        const metrics = await getRevenueMetrics(currentRange);
        return NextResponse.json({ metrics });
      }

      case "routes": {
        const performance = await getRoutePerformance(currentRange);
        return NextResponse.json({ performance });
      }

      case "occupancy": {
        const report = await getOccupancyReport();
        return NextResponse.json({ report });
      }

      case "trends": {
        const trends = await getBookingTrends(
          months ? parseInt(months, 10) : 12
        );
        return NextResponse.json({ trends });
      }

      case "dashboard": {
        // Return all data for dashboard
        const [kpis, metrics, performance, occupancy, trends] =
          await Promise.all([
            getKPIs(currentRange, previousRange),
            getRevenueMetrics(currentRange),
            getRoutePerformance(currentRange),
            getOccupancyReport(),
            getBookingTrends(12),
          ]);

        return NextResponse.json({
          kpis,
          metrics,
          performance,
          occupancy,
          trends,
          dateRange: currentRange,
        });
      }

      default:
        return NextResponse.json(
          { message: "Invalid analytics type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
