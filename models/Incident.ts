import mongoose, { Schema, type Document } from "mongoose";

export type IncidentType =
  | "breakdown"
  | "accident"
  | "flat_tire"
  | "engine_failure"
  | "electrical"
  | "flood_damage"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high";
export type IncidentStatus   = "open" | "resolved";

export interface IIncident extends Document {
  busDetailId: mongoose.Types.ObjectId;
  date: Date;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  location: string;
  description: string;
  resolution?: string;
  status: IncidentStatus;
  cost?: number;
  reportedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    busDetailId:  { type: Schema.Types.ObjectId, ref: "BusDetail", required: true, index: true },
    date:         { type: Date, required: true, index: true },
    incidentType: {
      type: String,
      enum: ["breakdown", "accident", "flat_tire", "engine_failure", "electrical", "flood_damage", "other"],
      required: true,
    },
    severity:     { type: String, enum: ["low", "medium", "high"], required: true },
    location:     { type: String, required: true, trim: true },
    description:  { type: String, required: true, trim: true },
    resolution:   { type: String, trim: true },
    status:       { type: String, enum: ["open", "resolved"], default: "open" },
    cost:         { type: Number, min: 0 },
    reportedBy:   { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Incident as mongoose.Model<IIncident>) ||
  mongoose.model<IIncident>("Incident", IncidentSchema);
