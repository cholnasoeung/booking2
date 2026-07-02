import mongoose, { Schema, type Document } from "mongoose";

export type ScheduleStatus = "scheduled" | "active" | "completed" | "cancelled" | "no_show";

export interface IDriverSchedule extends Document {
  driverId: mongoose.Types.ObjectId;
  busDetailId: mongoose.Types.ObjectId;
  busId?: mongoose.Types.ObjectId;
  date: Date;
  shiftStart: string;
  shiftEnd: string;
  status: ScheduleStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverScheduleSchema = new Schema<IDriverSchedule>(
  {
    driverId:    { type: Schema.Types.ObjectId, ref: "Driver",    required: true, index: true },
    busDetailId: { type: Schema.Types.ObjectId, ref: "BusDetail", required: true, index: true },
    busId:       { type: Schema.Types.ObjectId, ref: "Bus",       index: true },
    date:        { type: Date, required: true, index: true },
    shiftStart:  { type: String, required: true },
    shiftEnd:    { type: String, required: true },
    status:      { type: String, enum: ["scheduled","active","completed","cancelled","no_show"], default: "scheduled" },
    notes:       { type: String, trim: true },
  },
  { timestamps: true }
);

DriverScheduleSchema.index({ driverId: 1, date: 1 });
DriverScheduleSchema.index({ busDetailId: 1, date: 1 });

export default (mongoose.models.DriverSchedule as mongoose.Model<IDriverSchedule>) ||
  mongoose.model<IDriverSchedule>("DriverSchedule", DriverScheduleSchema);
