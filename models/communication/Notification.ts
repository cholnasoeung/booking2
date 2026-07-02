import mongoose, { Schema, type Document } from "mongoose";

export type NotificationType =
  | "announcement"
  | "booking_confirmed"
  | "booking_cancelled"
  | "trip_update"
  | "system";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  busId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["announcement", "booking_confirmed", "booking_cancelled", "trip_update", "system"],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    busId: { type: Schema.Types.ObjectId, ref: "Bus" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

const NotificationModel =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default NotificationModel;
