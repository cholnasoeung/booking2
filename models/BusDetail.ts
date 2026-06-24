import mongoose, { type Document, Schema } from "mongoose";

import { type BusType, type SeatLayout } from "@/lib/seat-layout";

export type VehicleDocType = "insurance" | "road_tax" | "inspection" | "permit" | "other";

export interface IVehicleDocument {
  _id: mongoose.Types.ObjectId;
  docType: VehicleDocType;
  docNumber: string;
  issueDate?: Date;
  expiryDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface IBusDetail extends Document {
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  seatLayoutTemplate?: SeatLayout | null;
  amenities: string[];
  images: string[];
  documents: IVehicleDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const VehicleDocumentSchema = new Schema<IVehicleDocument>(
  {
    docType: {
      type: String,
      enum: ["insurance", "road_tax", "inspection", "permit", "other"],
      required: true,
    },
    docNumber: { type: String, required: true, trim: true },
    issueDate:  { type: Date },
    expiryDate: { type: Date, required: true, index: true },
    notes:      { type: String, trim: true },
  },
  { timestamps: true }
);

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
      enum: ["bus_45", "mini_bus", "car", "sleeper_30", "sleeper_40"],
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
    documents: {
      type: [VehicleDocumentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const BusDetailModel =
  (mongoose.models.BusDetail as mongoose.Model<IBusDetail>) ||
  mongoose.model<IBusDetail>("BusDetail", BusDetailSchema);

export default BusDetailModel;
