import { connectToDatabase } from "@/lib/db/mongodb";
import mongoose from "mongoose";
import BusModel from "@/models/transport/Bus";
import BookingModel from "@/models/booking/Booking";
import UserModel from "@/models/user/User";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "pass" | "fail";
      latency?: number;
      message?: string;
    };
    memory: {
      status: "pass" | "warn" | "fail";
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: "pass" | "warn" | "fail";
      message?: string;
    };
  };
}

export interface SystemStatusResult {
  status: "operational" | "degraded" | "down";
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: "operational" | "degraded" | "down";
      connections: number;
      message?: string;
    };
    emailService: {
      status: "operational" | "degraded" | "down";
      provider: string;
      message?: string;
    };
    auth: {
      status: "operational" | "degraded" | "down";
      message?: string;
    };
  };
  metrics: {
    totalUsers: number;
    totalBookings: number;
    totalBuses: number;
    totalRoutes: number;
    activeBookings: number;
  };
}

/**
 * Check database connection health
 */
async function checkDatabaseHealth(): Promise<{
  status: "pass" | "fail";
  latency?: number;
  message?: string;
}> {
  try {
    const startTime = Date.now();

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return {
        status: "fail",
        message: "Database not connected",
      };
    }

    // Simple query to test connection
    await UserModel.findOne({}).limit(1).lean();

    const latency = Date.now() - startTime;

    // Warn if latency is high
    if (latency > 500) {
      return {
        status: "fail",
        latency,
        message: `High database latency: ${latency}ms`,
      };
    }

    return {
      status: "pass",
      latency,
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Database check failed",
    };
  }
}

/**
 * Check memory usage
 */
function checkMemoryHealth(): {
  status: "pass" | "warn" | "fail";
  used: number;
  total: number;
  percentage: number;
} {
  const used = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  const total = process.memoryUsage().heapTotal / 1024 / 1024; // MB
  const percentage = (used / total) * 100;

  let status: "pass" | "warn" | "fail" = "pass";
  if (percentage > 90) {
    status = "fail";
  } else if (percentage > 75) {
    status = "warn";
  }

  return {
    status,
    used: Math.round(used),
    total: Math.round(total),
    percentage: Math.round(percentage * 10) / 10,
  };
}

/**
 * Check disk space (basic check)
 */
function checkDiskHealth(): {
  status: "pass" | "warn" | "fail";
  message?: string;
} {
  // Note: Node.js doesn't have built-in disk space checking
  // In production, you'd use a library like 'diskusage'
  // For now, just return pass
  return {
    status: "pass",
  };
}

/**
 * Perform health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const [database, memory, disk] = await Promise.all([
    checkDatabaseHealth(),
    Promise.resolve(checkMemoryHealth()),
    Promise.resolve(checkDiskHealth()),
  ]);

  // Determine overall status
  const allChecks = [database, memory, disk];
  const hasFailures = allChecks.some((check) => check.status === "fail");
  const hasWarnings = allChecks.some((check) => check.status === "warn");

  let status: "healthy" | "degraded" | "unhealthy";
  if (hasFailures) {
    status = "unhealthy";
  } else if (hasWarnings) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database,
      memory,
      disk,
    },
  };
}

/**
 * Get detailed system status
 */
export async function getSystemStatus(): Promise<SystemStatusResult> {
  await connectToDatabase();

  // Check database
  const dbStatus =
    mongoose.connection.readyState === 1 ? "operational" : "down";
  const dbConnections = mongoose.connection.readyState === 1 ? 1 : 0;

  // Check email service
  const emailServiceStatus = process.env.RESEND_API_KEY
    ? "operational"
    : "degraded";

  // Check auth service
  const authStatus = "operational"; // Auth is part of the app, so if it's running, it's operational

  // Get metrics
  const [totalUsers, totalBookings, totalBuses, totalRoutes, activeBookings] =
    await Promise.all([
      UserModel.countDocuments(),
      BookingModel.countDocuments(),
      BusModel.countDocuments(),
      RouteModel.countDocuments(),
      BookingModel.countDocuments({ status: "confirmed" }),
    ]);

  // Determine overall status
  const services = [dbStatus, emailServiceStatus, authStatus];
  let overallStatus: "operational" | "degraded" | "down";
  if (services.some((s) => s === "down")) {
    overallStatus = "down";
  } else if (services.some((s) => s === "degraded")) {
    overallStatus = "degraded";
  } else {
    overallStatus = "operational";
  }

  return {
    status: overallStatus,
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: dbStatus,
        connections: dbConnections,
        message:
          dbStatus === "operational"
            ? "Database connected and responding"
            : "Database connection issue",
      },
      emailService: {
        status: emailServiceStatus,
        provider: "Resend",
        message:
          emailServiceStatus === "operational"
            ? "Email service configured"
            : "Email service not configured (running in dev mode)",
      },
      auth: {
        status: authStatus,
        message: "Authentication service operational",
      },
    },
    metrics: {
      totalUsers,
      totalBookings,
      totalBuses,
      totalRoutes,
      activeBookings,
    },
  };
}

/**
 * Get readiness status (for Kubernetes/probes)
 */
export async function getReadinessStatus(): Promise<{
  ready: boolean;
  checks: {
    database: boolean;
  };
}> {
  const isDbReady = mongoose.connection.readyState === 1;

  return {
    ready: isDbReady,
    checks: {
      database: isDbReady,
    },
  };
}

/**
 * Get liveness status (for Kubernetes/probes)
 */
export function getLivenessStatus(): {
  alive: boolean;
  uptime: number;
} {
  return {
    alive: true,
    uptime: process.uptime(),
  };
}
