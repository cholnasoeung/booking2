import mongoose, { Schema, type Document } from "mongoose";

export interface ISettings extends Document {
  general: {
    businessName: string;
    contactEmail: string;
    supportPhone: string;
    currency: string;
    timezone: string;
  };
  booking: {
    maxSeatsPerBooking: number;
    bookingCutoffMinutes: number;
    cancellationWindowHours: number;
    autoConfirm: boolean;
    requirePaymentUpfront: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    adminAlertEmail: string;
    notifyOnNewBooking: boolean;
    notifyOnCancellation: boolean;
  };
}

const SettingsSchema = new Schema<ISettings>(
  {
    general: {
      businessName: { type: String, default: "BusBooking" },
      contactEmail: { type: String, default: "" },
      supportPhone: { type: String, default: "" },
      currency: { type: String, default: "USD" },
      timezone: { type: String, default: "UTC" },
    },
    booking: {
      maxSeatsPerBooking: { type: Number, default: 6 },
      bookingCutoffMinutes: { type: Number, default: 30 },
      cancellationWindowHours: { type: Number, default: 24 },
      autoConfirm: { type: Boolean, default: true },
      requirePaymentUpfront: { type: Boolean, default: false },
    },
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      adminAlertEmail: { type: String, default: "" },
      notifyOnNewBooking: { type: Boolean, default: true },
      notifyOnCancellation: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default (mongoose.models.Settings as mongoose.Model<ISettings>) ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
