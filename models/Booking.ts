import mongoose, { type Document, Schema } from "mongoose";

export type BookingStatus = "confirmed" | "cancelled";

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  busId: mongoose.Types.ObjectId;
  seats: Array<string | number>;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    busId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    seats: {
      type: [Schema.Types.Mixed],
      required: true,
    },
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
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

BookingSchema.index({ userId: 1 });
BookingSchema.index({ busId: 1 });
BookingSchema.index({ status: 1 });

const BookingModel =
  (mongoose.models.Booking as mongoose.Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default BookingModel;
