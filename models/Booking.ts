import mongoose, { type Document, Schema } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type RefundStatus = "pending" | "processed" | "failed";

export interface IPassenger {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
  idProof?: string;
}

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  seats: string[];
  passengers: IPassenger[];
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  promoCode?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    bookingSource?: "web" | "mobile" | "admin";
  };
  boardingStop?: string;
  droppingStop?: string;
  createdAt: Date;
  updatedAt: Date;
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
      idProof: {
        type: String,
      },
    }],
    totalPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    boardingStop: String,
    droppingStop: String,
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    promoCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "refunded"],
      default: "confirmed",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "paid",
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      bookingSource: {
        type: String,
        enum: ["web", "mobile", "admin"],
        default: "web",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ bus: 1, status: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ promoCode: 1 });

// Method to cancel booking with refund calculation
BookingSchema.methods.cancel = async function(reason: string) {
  if (this.status === "cancelled") {
    throw new Error("Booking is already cancelled");
  }
  if (this.status === "refunded") {
    throw new Error("Booking is already refunded");
  }

  const now = new Date();

  // Get bus departure time
  const Bus = mongoose.model("Bus");
  const bus = await Bus.findById(this.bus);

  if (!bus) {
    throw new Error("Bus not found");
  }

  // Calculate refund based on timing before departure
  const hoursUntilDeparture = (bus.date.getTime() - now.getTime()) / (1000 * 60 * 60);
  let refundPercentage = 0;

  if (hoursUntilDeparture > 48) {
    refundPercentage = 100;
  } else if (hoursUntilDeparture > 24) {
    refundPercentage = 75;
  } else if (hoursUntilDeparture > 4) {
    refundPercentage = 50;
  }

  this.status = "cancelled";
  this.cancelledAt = now;
  this.cancellationReason = reason;
  this.refundAmount = (this.finalPrice * refundPercentage) / 100;
  this.refundStatus = this.refundAmount > 0 ? "pending" : undefined;

  await this.save();

  // Increment promo code usage if applicable
  if (this.promoCode) {
    const PromoCode = mongoose.model("PromoCode");
    await PromoCode.incrementUsage?.(this.promoCode);
  }

  return this;
};

// Static method to check real-time seat availability
BookingSchema.statics.checkSeatAvailability = async function(busId: string, seats: string[]) {
  const Bus = mongoose.model("Bus");
  const bus = await Bus.findById(busId).lean();

  if (!bus) {
    throw new Error("Bus not found");
  }

  // Get all booked seats from confirmed/pending bookings
  const bookedBookings = await this.find({
    bus: busId,
    status: { $in: ["confirmed", "pending"] },
  }).select("seats");

  const bookedSeats = bookedBookings.flatMap(b => b.seats);
  const blockedSeats = bus.blockedSeats || [];

  const unavailableSeats = [...new Set([...bookedSeats, ...blockedSeats])];
  const availableSeats = seats.filter(seat => !unavailableSeats.includes(seat));

  return {
    available: availableSeats.length === seats.length,
    requestedSeats: seats,
    availableSeats,
    unavailableSeats: seats.filter(seat => unavailableSeats.includes(seat)),
  };
};

const BookingModel =
  (mongoose.models.Booking as mongoose.Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default BookingModel;
