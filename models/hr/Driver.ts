import mongoose, { type Document, Schema } from "mongoose";

export type DriverStatus = "active" | "inactive";

export interface IDriver extends Document {
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber?: string;
  avatar?: string;
  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DriverSchema.index({ status: 1 });

const DriverModel =
  (mongoose.models.Driver as mongoose.Model<IDriver>) ||
  mongoose.model<IDriver>("Driver", DriverSchema);

export default DriverModel;
