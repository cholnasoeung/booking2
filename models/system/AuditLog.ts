import mongoose, { Schema, Model, Document } from "mongoose";

export interface IAuditLog {
  entityType: "booking" | "bus" | "route" | "user" | "promo_code" | "system";
  entityId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "cancel"
    | "refund"
    | "price_change"
    | "status_change"
    | "login"
    | "logout"
    | "bulk_import"
    | "bulk_export";
  userId?: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    relatedEntityId?: string;
    [key: string]: any;
  };
  timestamp: Date;
  severity?: "low" | "medium" | "high" | "critical";
}

interface IAuditLogDocument extends IAuditLog, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["booking", "bus", "route", "user", "promo_code", "system"],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "cancel",
        "refund",
        "price_change",
        "status_change",
        "login",
        "logout",
        "bulk_import",
        "bulk_export",
      ],
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    userName: String,
    userEmail: String,
    role: String,
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: {
      ipAddress: String,
      userAgent: String,
      reason: String,
      relatedEntityId: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });

// TTL index: Automatically delete logs older than 1 year (configurable)
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60, name: "ttl_index" }
);

const AuditLogModel =
  (mongoose.models.AuditLog as Model<IAuditLogDocument>) ||
  mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);

export default AuditLogModel;
