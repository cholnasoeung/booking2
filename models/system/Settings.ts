import mongoose, { Schema, type Document } from "mongoose";

export interface ISettings extends Document {
  logoUrl?: string;
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
  payment: {
    stripe: {
      enabled: boolean;
      publishableKey: string;
      secretKey: string;
      webhookSecret: string;
    };
    abaPayway: {
      enabled: boolean;
      merchantId: string;
      apiKey: string;
      publicKey: string;
    };
    activeGateway: "stripe" | "abaPayway" | "none";
  };
  sms: {
    twilio: {
      enabled: boolean;
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
  };
}

const SettingsSchema = new Schema<ISettings>(
  {
    logoUrl: { type: String, default: "" },
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
    payment: {
      stripe: {
        enabled: { type: Boolean, default: false },
        publishableKey: { type: String, default: "" },
        secretKey: { type: String, default: "" },
        webhookSecret: { type: String, default: "" },
      },
      abaPayway: {
        enabled: { type: Boolean, default: false },
        merchantId: { type: String, default: "" },
        apiKey: { type: String, default: "" },
        publicKey: { type: String, default: "" },
      },
      activeGateway: { type: String, enum: ["stripe", "abaPayway", "none"], default: "none" },
    },
    sms: {
      twilio: {
        enabled: { type: Boolean, default: false },
        accountSid: { type: String, default: "" },
        authToken: { type: String, default: "" },
        fromNumber: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

export default (mongoose.models.Settings as mongoose.Model<ISettings>) ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
