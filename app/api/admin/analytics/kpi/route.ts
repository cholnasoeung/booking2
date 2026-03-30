import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getKPIMetrics } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getKPIMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Error fetching KPI metrics:", error);
    return NextResponse.json(
      { message: "Failed to fetch KPI metrics" },
      { status: 500 }
    );
  }
}
