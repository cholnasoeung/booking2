import mongoose, { type Document, Schema } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave";
export type StaffType = "driver" | "employee";

export interface IAttendance extends Document {
  staffId: mongoose.Types.ObjectId;
  staffType: StaffType;
  date: Date;
  status: AttendanceStatus;
  checkIn?: string;  // "08:30"
  checkOut?: string; // "17:00"
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId; // admin who recorded
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    staffId:    { type: Schema.Types.ObjectId, required: true, index: true },
    staffType:  { type: String, enum: ["driver", "employee"], required: true },
    date:       { type: Date, required: true },
    status:     { type: String, enum: ["present", "absent", "late", "half_day", "on_leave"], required: true, default: "present" },
    checkIn:    { type: String, trim: true },
    checkOut:   { type: String, trim: true },
    notes:      { type: String, trim: true, maxlength: 500 },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One record per staff per day
AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: -1 });
AttendanceSchema.index({ status: 1 });

export default (mongoose.models.Attendance as mongoose.Model<IAttendance>) ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
