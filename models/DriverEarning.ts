import mongoose, { Schema, type Document } from "mongoose";

export interface IDriverEarning extends Document {
  driverId: mongoose.Types.ObjectId;
  busDetailId?: mongoose.Types.ObjectId;
  date: Date;
  regularTrips: number;
  overtimeTrips: number;
  basePay: number;
  overtimeRate: number;
  regularEarnings: number;
  overtimeEarnings: number;
  totalEarnings: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverEarningSchema = new Schema<IDriverEarning>(
  {
    driverId:         { type: Schema.Types.ObjectId, ref: "Driver",    required: true, index: true },
    busDetailId:      { type: Schema.Types.ObjectId, ref: "BusDetail", index: true },
    date:             { type: Date, required: true, index: true },
    regularTrips:     { type: Number, required: true, min: 0, default: 0 },
    overtimeTrips:    { type: Number, required: true, min: 0, default: 0 },
    basePay:          { type: Number, required: true, min: 0 },
    overtimeRate:     { type: Number, required: true, min: 1, default: 1.5 },
    regularEarnings:  { type: Number, required: true, min: 0 },
    overtimeEarnings: { type: Number, required: true, min: 0 },
    totalEarnings:    { type: Number, required: true, min: 0 },
    notes:            { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.DriverEarning as mongoose.Model<IDriverEarning>) ||
  mongoose.model<IDriverEarning>("DriverEarning", DriverEarningSchema);
