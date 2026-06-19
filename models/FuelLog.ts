import mongoose, { Schema, type Document } from "mongoose";

export interface IFuelLog extends Document {
  busDetailId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  date: Date;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer?: number;
  station?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FuelLogSchema = new Schema<IFuelLog>(
  {
    busDetailId:   { type: Schema.Types.ObjectId, ref: "BusDetail", required: true, index: true },
    driverId:      { type: Schema.Types.ObjectId, ref: "Driver",    required: true, index: true },
    date:          { type: Date, required: true, index: true },
    liters:        { type: Number, required: true, min: 0.1 },
    pricePerLiter: { type: Number, required: true, min: 0 },
    totalCost:     { type: Number, required: true, min: 0 },
    odometer:      { type: Number, min: 0 },
    station:       { type: String, trim: true },
    notes:         { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.FuelLog as mongoose.Model<IFuelLog>) ||
  mongoose.model<IFuelLog>("FuelLog", FuelLogSchema);
