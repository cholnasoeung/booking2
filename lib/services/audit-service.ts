import { connectToDatabase } from "@/lib/db/mongodb";
import AuditLogModel from "@/models/system/AuditLog";
import type { IAuditLog } from "@/models/system/AuditLog";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Extract client information from request
 */
export function extractClientInfo(request: NextRequest): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  entityType: IAuditLog["entityType"];
  entityId: string;
  action: IAuditLog["action"];
  userId?: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  changes?: IAuditLog["changes"];
  metadata?: IAuditLog["metadata"];
  severity?: IAuditLog["severity"];
}): Promise<void> {
  try {
    await connectToDatabase();

    await AuditLogModel.create({
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Log booking creation
 */
export async function logBookingCreated(data: {
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  busId: string;
  seats: string[];
  amount: number;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: "booking",
    entityId: data.bookingId,
    action: "create",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: [
      { field: "status", newValue: "confirmed" },
      { field: "busId", newValue: data.busId },
      { field: "seats", newValue: data.seats },
      { field: "amount", newValue: data.amount },
    ],
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
    },
    severity: "medium",
  });
}

/**
 * Log booking cancellation
 */
export async function logBookingCancelled(data: {
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  reason?: string;
  refundAmount?: number;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: "booking",
    entityId: data.bookingId,
    action: "cancel",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: [
      { field: "status", oldValue: "confirmed", newValue: "cancelled" },
      ...(data.refundAmount
        ? [{ field: "refundAmount", newValue: data.refundAmount }]
        : []),
    ],
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
      reason: data.reason,
    },
    severity: data.refundAmount ? "high" : "medium",
  });
}

/**
 * Log price change
 */
export async function logPriceChange(data: {
  busId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  const priceDiff = Math.abs(data.newPrice - data.oldPrice);
  const priceDiffPercent = (priceDiff / data.oldPrice) * 100;

  let severity: IAuditLog["severity"] = "low";
  if (priceDiffPercent > 20) {
    severity = "critical";
  } else if (priceDiffPercent > 10) {
    severity = "high";
  } else if (priceDiffPercent > 5) {
    severity = "medium";
  }

  await createAuditLog({
    entityType: "bus",
    entityId: data.busId,
    action: "price_change",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: [
      { field: "pricePerSeat", oldValue: data.oldPrice, newValue: data.newPrice },
    ],
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
      reason: data.reason,
      priceDiffPercent: priceDiffPercent.toFixed(2) + "%",
    },
    severity,
  });
}

/**
 * Log route/bus creation
 */
export async function logEntityCreated(data: {
  entityType: "bus" | "route" | "promo_code";
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  entityData: any;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: data.entityType,
    entityId: data.entityId,
    action: "create",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: Object.keys(data.entityData).map((key) => ({
      field: key,
      newValue: data.entityData[key],
    })),
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
    },
    severity: "medium",
  });
}

/**
 * Log route/bus update
 */
export async function logEntityUpdated(data: {
  entityType: "bus" | "route" | "promo_code";
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  changes: Array<{ field: string; oldValue: any; newValue: any }>;
  reason?: string;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: data.entityType,
    entityId: data.entityId,
    action: "update",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: data.changes,
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
      reason: data.reason,
    },
    severity: "low",
  });
}

/**
 * Log route/bus deletion
 */
export async function logEntityDeleted(data: {
  entityType: "bus" | "route" | "promo_code";
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  reason?: string;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: data.entityType,
    entityId: data.entityId,
    action: "delete",
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
      reason: data.reason,
    },
    severity: "high",
  });
}

/**
 * Log bulk import/export operations
 */
export async function logBulkOperation(data: {
  action: "bulk_import" | "bulk_export";
  entityType: "bus" | "route";
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  recordCount: number;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: data.entityType,
    entityId: "bulk", // Special ID for bulk operations
    action: data.action,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    changes: [{ field: "recordCount", newValue: data.recordCount }],
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
    },
    severity: "medium",
  });
}

/**
 * Log user login/logout
 */
export async function logAuthEvent(data: {
  action: "login" | "logout";
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  clientInfo: { ipAddress: string; userAgent: string };
}): Promise<void> {
  await createAuditLog({
    entityType: "user",
    entityId: data.userId,
    action: data.action,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    role: data.role,
    metadata: {
      ipAddress: data.clientInfo.ipAddress,
      userAgent: data.clientInfo.userAgent,
    },
    severity: "low",
  });
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(params: {
  entityType?: IAuditLog["entityType"];
  entityId?: string;
  userId?: string;
  action?: IAuditLog["action"];
  severity?: IAuditLog["severity"];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}): Promise<{ logs: IAuditLog[]; total: number }> {
  await connectToDatabase();

  const query: any = {};

  if (params.entityType) {
    query.entityType = params.entityType;
  }

  if (params.entityId) {
    query.entityId = params.entityId;
  }

  if (params.userId) {
    query.userId = params.userId;
  }

  if (params.action) {
    query.action = params.action;
  }

  if (params.severity) {
    query.severity = params.severity;
  }

  if (params.startDate || params.endDate) {
    query.timestamp = {};
    if (params.startDate) {
      query.timestamp.$gte = params.startDate;
    }
    if (params.endDate) {
      query.timestamp.$lte = params.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(params.limit || 100)
      .skip(params.skip || 0)
      .lean(),
    AuditLogModel.countDocuments(query),
  ]);

  return { logs, total };
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: IAuditLog["entityType"],
  entityId: string
): Promise<IAuditLog[]> {
  await connectToDatabase();

  const logs = await AuditLogModel.find({
    entityType,
    entityId,
  })
    .sort({ timestamp: -1 })
    .limit(500)
    .lean();

  return logs;
}
