import mongoose, { type Document, Schema } from "mongoose";

import {
  type BusType,
  type SeatLayout,
  needsLegacySeatLayoutUpgrade,
  normalizeBusSeatLayout,
} from "@/lib/seat-layout";

export interface IBus extends Document {
  routeId: mongoose.Types.ObjectId;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  busType: BusType;
  seatLayout?: SeatLayout | null;
  totalSeats: number;
  bookedSeats: Array<string | number>;
  pricePerSeat: number;
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
  busType: {
    type: String,
    enum: ["sleeping_bus", "mini_bus", "car"],
    default: "mini_bus",
    required: true,
  },
  seatLayout: {
    type: Schema.Types.Mixed,
    default: null,
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
  pricePerSeat: {
    type: Number,
    required: true,
    min: 1,
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
