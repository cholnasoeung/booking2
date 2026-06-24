import mongoose, { type Document, Schema } from "mongoose";

import {
  type BusType,
  type SeatLayout,
  needsLegacySeatLayoutUpgrade,
  normalizeBusSeatLayout,
} from "@/lib/seat-layout";
import { type BusStop } from "@/types/bus";

export type BusDepartureStatus = "scheduled" | "on_time" | "delayed" | "departed" | "arrived" | "cancelled";

export interface IBus extends Document {
  routeId: mongoose.Types.ObjectId;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  busType: BusType;
  busNumber?: string;
  hasUpperDeck?: boolean;
  seatLayout?: SeatLayout | null;
  totalSeats: number;
  bookedSeats: Array<string | number>;
  blockedSeats: Array<string | number>;
  stops: BusStop[];
  pricePerSeat: number;
  amenities?: string[];
  driverId?: mongoose.Types.ObjectId | null;
  busDetailId?: mongoose.Types.ObjectId | null;
  departureStatus: BusDepartureStatus;
  delayMinutes?: number;
  statusNote?: string;
}

const BusSchema = new Schema<IBus>({
  routeId: {
    type: Schema.Types.ObjectId,
    ref: "Route",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  departureTime: {
    type: String,
    required: true,
    trim: true,
  },
  arrivalTime: {
    type: String,
    required: true,
    trim: true,
  },
  busNumber: {
    type: String,
    trim: true,
  },
  busType: {
    type: String,
    enum: ["bus_45", "mini_bus", "car", "sleeper_30", "sleeper_40"],
    default: "bus_45",
    required: true,
  },
  seatLayout: {
    type: Schema.Types.Mixed,
    default: null,
  },
  hasUpperDeck: {
    type: Boolean,
    default: false,
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1,
  },
  bookedSeats: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  blockedSeats: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  stops: {
    type: [
      {
        location: { type: String, required: true },
        boarding: { type: Boolean, default: false },
        dropping: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  pricePerSeat: {
    type: Number,
    required: true,
    min: 1,
  },
  amenities: {
    type: [String],
    default: [],
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },
  busDetailId: {
    type: Schema.Types.ObjectId,
    ref: "BusDetail",
    default: null,
  },
  departureStatus: {
    type: String,
    enum: ["scheduled", "on_time", "delayed", "departed", "arrived", "cancelled"],
    default: "scheduled",
  },
  delayMinutes: {
    type: Number,
    default: 0,
  },
  statusNote: {
    type: String,
    maxlength: 300,
    default: "",
  },
});

BusSchema.index({ routeId: 1, date: 1 });
BusSchema.index({ date: 1 });

BusSchema.methods.ensureSeatLayout = async function ensureSeatLayout() {
  if (!needsLegacySeatLayoutUpgrade(this.toObject())) {
    return this;
  }

  const normalized = normalizeBusSeatLayout(this.toObject());
  this.busType = normalized.busType;
  this.seatLayout = normalized.seatLayout;
  this.totalSeats = normalized.totalSeats;
  this.bookedSeats = normalized.bookedSeats;
  await this.save();
  return this;
};

const BusModel =
  (mongoose.models.Bus as mongoose.Model<IBus>) ||
  mongoose.model<IBus>("Bus", BusSchema);

export default BusModel;
