import mongoose, { type Document, Schema } from "mongoose";

export interface IWaitingList extends Document {
  user: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  route: mongoose.Types.ObjectId;
  requestedSeats: number;
  requestedDate: string;
  requestedDepartureTime: string;
  status: "active" | "notified" | "booked" | "expired" | "cancelled";
  notifiedAt?: Date;
  notificationExpiresAt?: Date;
  expiresAt: Date;
  priority: number; // Higher number = higher priority
  notes?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitingListEntryData {
  userId: string;
  busId: string;
  routeId: string;
  requestedSeats: number;
  requestedDate: string;
  requestedDepartureTime: string;
  expiresAt?: Date;
  priority?: number;
}

export interface WaitingListModelStatic extends mongoose.Model<IWaitingList> {
  addToWaitingList(data: WaitingListEntryData): Promise<IWaitingList>;
  getNextInLine(busId: string, seatsAvailable: number): Promise<IWaitingList[]>;
  notifyUsers(busId: string, seatsAvailable: number): Promise<any[]>;
  expireOldNotifications(): Promise<mongoose.UpdateWriteOpResult>;
}

const WaitingListSchema = new Schema<IWaitingList, WaitingListModelStatic>(
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
    route: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    requestedSeats: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    requestedDate: {
      type: String,
      required: true,
    },
    requestedDepartureTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "notified", "booked", "expired", "cancelled"],
      default: "active",
    },
    notifiedAt: {
      type: Date,
    },
    notificationExpiresAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    priority: {
      type: Number,
      default: 1, // Can be increased for loyalty members, etc.
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
WaitingListSchema.index({ bus: 1, status: 1, priority: -1, createdAt: 1 });
WaitingListSchema.index({ user: 1, status: 1 });
WaitingListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to add to waiting list
WaitingListSchema.statics.addToWaitingList = async function(
  this: WaitingListModelStatic,
  data: WaitingListEntryData
) {
  const expiresAt = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

  const entry = await this.create({
    user: data.userId,
    bus: data.busId,
    route: data.routeId,
    requestedSeats: data.requestedSeats,
    requestedDate: data.requestedDate,
    requestedDepartureTime: data.requestedDepartureTime,
    expiresAt,
    priority: data.priority || 1,
  });

  return entry;
};

// Static method to get next in line for a bus
WaitingListSchema.statics.getNextInLine = async function(
  this: WaitingListModelStatic,
  busId: string,
  seatsAvailable: number
) {
  const entries = await this.find({
    bus: busId,
    status: "active",
    requestedSeats: { $lte: seatsAvailable },
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(5)
    .populate("user")
    .lean();

  return entries;
};

// Static method to notify waiting list users
WaitingListSchema.statics.notifyUsers = async function(
  this: WaitingListModelStatic,
  busId: string,
  seatsAvailable: number
) {
  const usersToNotify = await this.getNextInLine(busId, seatsAvailable);
  const notified = [];

  for (const entry of usersToNotify as any[]) {
    const notificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours to respond

    await this.findByIdAndUpdate(entry._id, {
      status: "notified",
      notifiedAt: new Date(),
      notificationExpiresAt,
    });

    // Send notification (email/SMS)
    notified.push({
      userId: entry.user._id,
      userEmail: entry.user.email,
      userName: entry.user.name,
      waitingListId: entry._id,
      seatsAvailable: seatsAvailable,
    });
  }

  return notified;
};

// Static method to expire old notifications
WaitingListSchema.statics.expireOldNotifications = async function(
  this: WaitingListModelStatic
) {
  const expired = await this.updateMany(
    {
      status: "notified",
      notificationExpiresAt: { $lt: new Date() },
    },
    {
      status: "expired",
    }
  );

  return expired;
};

const WaitingListModel =
  (mongoose.models.WaitingList as WaitingListModelStatic) ||
  mongoose.model<IWaitingList, WaitingListModelStatic>("WaitingList", WaitingListSchema);

export default WaitingListModel;
