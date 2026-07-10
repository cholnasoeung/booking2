import mongoose, { type Document, Schema } from "mongoose";

export type LeaveType   = "annual" | "sick" | "emergency" | "unpaid" | "maternity" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type StaffType   = "driver" | "employee";

export interface ILeaveRequest extends Document {
  staffId:    mongoose.Types.ObjectId;
  staffType:  StaffType;
  leaveType:  LeaveType;
  startDate:  Date;
  endDate:    Date;
  days:       number;
  reason:     string;
  status:     LeaveStatus;
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt:  Date;
  updatedAt:  Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    staffId:    { type: Schema.Types.ObjectId, required: true, index: true },
    staffType:  { type: String, enum: ["driver", "employee"], required: true },
    leaveType:  { type: String, enum: ["annual", "sick", "emergency", "unpaid", "maternity", "other"], required: true },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    days:       { type: Number, required: true, min: 1 },
    reason:     { type: String, required: true, trim: true, maxlength: 1000 },
    status:     { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
    adminNote:  { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ staffId: 1, startDate: -1 });
LeaveRequestSchema.index({ status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

export default (mongoose.models.LeaveRequest as mongoose.Model<ILeaveRequest>) ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
