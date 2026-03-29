import mongoose, { type Document, Schema } from "mongoose";

export type BookingStatus = "confirmed" | "cancelled";

export interface IPassenger {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
}

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  seats: string[];
  passengers: IPassenger[];
  totalPrice: number;
  status: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bus: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
    },
    passengers: [{
      name: {
        type: String,
        required: true,
      },
      age: {
        type: String,
        required: true,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      contactNumber: {
        type: String,
        required: true,
      },
      email: {
        type: String,
      },
    }],
    totalPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      required: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

BookingSchema.index({ user: 1 });
BookingSchema.index({ bus: 1 });
BookingSchema.index({ status: 1 });

const BookingModel =
  (mongoose.models.Booking as mongoose.Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default BookingModel;
