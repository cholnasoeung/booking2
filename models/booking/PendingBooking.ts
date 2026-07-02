import mongoose, { Schema, type Document } from "mongoose";
import type { Passenger } from "@/types/passenger";

export interface IPendingBooking extends Document {
  userId: string;
  busId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
  promoCode?: string;
  boardingStop?: string;
  droppingStop?: string;
  gateway: "stripe" | "abaPayway";
  gatewaySessionId?: string;
  status: "pending" | "paid" | "failed" | "expired";
  expiresAt: Date;
  createdBookingId?: string;
}

const PendingBookingSchema = new Schema<IPendingBooking>(
  {
    userId: { type: String, required: true },
    busId: { type: String, required: true },
    seats: [{ type: String }],
    passengers: [Schema.Types.Mixed],
    totalPrice: { type: Number, required: true },
    promoCode: { type: String },
    boardingStop: { type: String },
    droppingStop: { type: String },
    gateway: { type: String, enum: ["stripe", "abaPayway"], required: true },
    gatewaySessionId: { type: String },
    status: { type: String, enum: ["pending", "paid", "failed", "expired"], default: "pending" },
    expiresAt: { type: Date, required: true },
    createdBookingId: { type: String },
  },
  { timestamps: true }
);

// Auto-delete expired records from MongoDB
PendingBookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.PendingBooking as mongoose.Model<IPendingBooking>) ||
  mongoose.model<IPendingBooking>("PendingBooking", PendingBookingSchema);
