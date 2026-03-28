import mongoose, { type Document, Schema } from "mongoose";

export interface IBus extends Document {
  routeId: mongoose.Types.ObjectId;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  bookedSeats: number[];
  pricePerSeat: number;
}

const BusSchema = new Schema<IBus>({
  routeId: {
    type: Schema.Types.ObjectId,
    ref: "Route",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  departureTime: {
    type: String,
    required: true,
    trim: true,
  },
  arrivalTime: {
    type: String,
    required: true,
    trim: true,
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1,
  },
  bookedSeats: {
    type: [Number],
    default: [],
  },
  pricePerSeat: {
    type: Number,
    required: true,
    min: 1,
  },
});

BusSchema.index({ routeId: 1, date: 1 });
BusSchema.index({ date: 1 });

const BusModel =
  (mongoose.models.Bus as mongoose.Model<IBus>) ||
  mongoose.model<IBus>("Bus", BusSchema);

export default BusModel;
