import mongoose, { Schema, type Document } from "mongoose";

export type MaintenanceType =
  | "oil_change" | "tire" | "brake" | "engine"
  | "inspection" | "electrical" | "bodywork" | "other";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed";

export interface IMaintenance extends Document {
  busDetailId: mongoose.Types.ObjectId;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  date: Date;
  cost: number;
  workshop?: string;
  odometer?: number;
  nextServiceDate?: Date;
  nextServiceOdometer?: number;
  description: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceSchema = new Schema<IMaintenance>(
  {
    busDetailId:         { type: Schema.Types.ObjectId, ref: "BusDetail", required: true, index: true },
    maintenanceType:     { type: String, enum: ["oil_change","tire","brake","engine","inspection","electrical","bodywork","other"], required: true },
    status:              { type: String, enum: ["scheduled","in_progress","completed"], default: "completed" },
    date:                { type: Date, required: true, index: true },
    cost:                { type: Number, required: true, min: 0 },
    workshop:            { type: String, trim: true },
    odometer:            { type: Number, min: 0 },
    nextServiceDate:     { type: Date, index: true },
    nextServiceOdometer: { type: Number, min: 0 },
    description:         { type: String, required: true, trim: true },
    notes:               { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Maintenance as mongoose.Model<IMaintenance>) ||
  mongoose.model<IMaintenance>("Maintenance", MaintenanceSchema);
