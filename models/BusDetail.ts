import mongoose, { type Document, Schema } from "mongoose";

import { type BusType, type SeatLayout } from "@/lib/seat-layout";

export interface IBusDetail extends Document {
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  seatLayoutTemplate?: SeatLayout | null;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BusDetailSchema = new Schema<IBusDetail>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
    busType: {
      type: String,
      enum: ["bus_45", "mini_bus", "car"],
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    seatLayoutTemplate: {
      type: Schema.Types.Mixed,
      default: null,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

BusDetailSchema.index({ registrationNumber: 1 });

const BusDetailModel =
  (mongoose.models.BusDetail as mongoose.Model<IBusDetail>) ||
  mongoose.model<IBusDetail>("BusDetail", BusDetailSchema);

export default BusDetailModel;
