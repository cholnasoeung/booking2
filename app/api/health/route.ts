import { NextRequest, NextResponse } from "next/server";
import {
  performHealthCheck,
  getReadinessStatus,
  getLivenessStatus,
} from "@/lib/services/health-service";

export const runtime = "nodejs";

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "health", "ready", "alive"

    if (type === "ready") {
      // Readiness probe (for Kubernetes)
      const readiness = await getReadinessStatus();
      const status = readiness.ready ? 200 : 503;

      return NextResponse.json(readiness, { status });
    }

    if (type === "alive") {
      // Liveness probe (for Kubernetes)
      const liveness = getLivenessStatus();

      return NextResponse.json(liveness);
    }

    // Default health check
    const health = await performHealthCheck();

    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 }
    );
  }
}
