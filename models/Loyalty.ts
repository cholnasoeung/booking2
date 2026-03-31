import mongoose, { type Document, Schema } from "mongoose";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface ILoyalty extends Document {
  user: mongoose.Types.ObjectId;
  tier: LoyaltyTier;
  points: number;
  lifetimePoints: number;
  totalBookings: number;
  totalSpent: number;
  benefits: {
    prioritySupport: boolean;
    seatSelectionPriority: boolean;
    freeCancellation: boolean;
    extraBaggage: boolean;
    discounts: number; // Percentage discount
  };
  pointsHistory: Array<{
    points: number;
    type: "earned" | "redeemed" | "expired" | "adjusted";
    description: string;
    bookingId?: mongoose.Types.ObjectId;
    expiresAt?: Date;
    createdAt: Date;
  }>;
  tierProgress: {
    currentTierPoints: number;
    nextTierPoints: number;
    nextTier: LoyaltyTier | null;
  };
  metadata: {
    lastActivityAt: Date;
    consecutiveBookings: number;
    referralCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Tier configurations
export const LOYALTY_TIERS: Record<LoyaltyTier, { name: string; points: number; benefits: any }> = {
  bronze: {
    name: "Bronze",
    points: 0,
    benefits: {
      prioritySupport: false,
      seatSelectionPriority: false,
      freeCancellation: false,
      extraBaggage: false,
      discounts: 0,
    },
  },
  silver: {
    name: "Silver",
    points: 1000,
    benefits: {
      prioritySupport: true,
      seatSelectionPriority: false,
      freeCancellation: false,
      extraBaggage: false,
      discounts: 5,
    },
  },
  gold: {
    name: "Gold",
    points: 5000,
    benefits: {
      prioritySupport: true,
      seatSelectionPriority: true,
      freeCancellation: true,
      extraBaggage: true,
      discounts: 10,
    },
  },
  platinum: {
    name: "Platinum",
    points: 10000,
    benefits: {
      prioritySupport: true,
      seatSelectionPriority: true,
      freeCancellation: true,
      extraBaggage: true,
      discounts: 15,
    },
  },
};

const LoyaltySchema = new Schema<ILoyalty>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      default: "bronze",
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    benefits: {
      prioritySupport: { type: Boolean, default: false },
      seatSelectionPriority: { type: Boolean, default: false },
      freeCancellation: { type: Boolean, default: false },
      extraBaggage: { type: Boolean, default: false },
      discounts: { type: Number, default: 0, min: 0, max: 100 },
    },
    pointsHistory: [{
      points: { type: Number, required: true },
      type: {
        type: String,
        enum: ["earned", "redeemed", "expired", "adjusted"],
        required: true,
      },
      description: { type: String, required: true },
      bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
      expiresAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
    }],
    tierProgress: {
      currentTierPoints: { type: Number, default: 0 },
      nextTierPoints: { type: Number, default: 1000 },
      nextTier: { type: String, enum: ["silver", "gold", "platinum", null], default: "silver" },
    },
    metadata: {
      lastActivityAt: { type: Date, default: Date.now },
      consecutiveBookings: { type: Number, default: 0 },
      referralCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LoyaltySchema.index({ user: 1 });
LoyaltySchema.index({ tier: 1, points: -1 });

// Instance method to add points
LoyaltySchema.methods.addPoints = async function(
  points: number,
  description: string,
  bookingId?: string
) {
  const pointsExpiresAt = new Date();
  pointsExpiresAt.setFullYear(pointsExpiresAt.getFullYear() + 1); // Points expire after 1 year

  this.points += points;
  this.lifetimePoints += points;
  this.pointsHistory.push({
    points,
    type: "earned",
    description,
    bookingId,
    expiresAt: pointsExpiresAt,
    createdAt: new Date(),
  });

  await this.checkAndUpdateTier();
  await this.save();

  return this;
};

// Instance method to redeem points
LoyaltySchema.methods.redeemPoints = async function(
  points: number,
  description: string
) {
  if (this.points < points) {
    throw new Error("Insufficient points");
  }

  this.points -= points;
  this.pointsHistory.push({
    points: -points,
    type: "redeemed",
    description,
    createdAt: new Date(),
  });

  await this.save();

  return this;
};

// Instance method to check and update tier
LoyaltySchema.methods.checkAndUpdateTier = async function() {
  const newTier = this.calculateTier(this.lifetimePoints);

  if (newTier !== this.tier) {
    this.tier = newTier;
    this.benefits = LOYALTY_TIERS[newTier].benefits;

    // Add tier upgrade to history
    this.pointsHistory.push({
      points: 0,
      type: "adjusted",
      description: `Tier upgraded to ${LOYALTY_TIERS[newTier].name}`,
      createdAt: new Date(),
    });
  }

  // Update tier progress
  const tiers: LoyaltyTier[] = ["bronze", "silver", "gold", "platinum"];
  const currentIndex = tiers.indexOf(this.tier);

  if (currentIndex < tiers.length - 1) {
    const nextTier = tiers[currentIndex + 1];
    this.tierProgress.nextTier = nextTier;
    this.tierProgress.nextTierPoints = LOYALTY_TIERS[nextTier].points;
    this.tierProgress.currentTierPoints = this.lifetimePoints - LOYALTY_TIERS[this.tier].points;
  } else {
    this.tierProgress.nextTier = null;
  }

  return this;
};

// Helper method to calculate tier from points
LoyaltySchema.methods.calculateTier = function(points: number): LoyaltyTier {
  if (points >= LOYALTY_TIERS.platinum.points) return "platinum";
  if (points >= LOYALTY_TIERS.gold.points) return "gold";
  if (points >= LOYALTY_TIERS.silver.points) return "silver";
  return "bronze";
};

// Static method to get or create loyalty account
LoyaltySchema.statics.getOrCreate = async function(userId: string) {
  let loyalty = await this.findOne({ user: userId });

  if (!loyalty) {
    loyalty = await this.create({
      user: userId,
      tier: "bronze",
      points: 0,
      lifetimePoints: 0,
      benefits: LOYALTY_TIERS.bronze.benefits,
    });
  }

  return loyalty;
};

// Static method to process booking and award points
LoyaltySchema.statics.processBooking = async function(
  userId: string,
  bookingAmount: number,
  bookingId: string
) {
  const loyalty = await this.getOrCreate(userId);

  // Award points: 1 point per $1 spent
  const pointsEarned = Math.floor(bookingAmount);
  await loyalty.addPoints(
    pointsEarned,
    `Points earned from booking`,
    bookingId
  );

  loyalty.totalBookings += 1;
  loyalty.totalSpent += bookingAmount;
  loyalty.metadata.lastActivityAt = new Date();
  loyalty.metadata.consecutiveBookings += 1;

  await loyalty.save();

  return loyalty;
};

const LoyaltyModel =
  (mongoose.models.Loyalty as mongoose.Model<ILoyalty>) ||
  mongoose.model<ILoyalty>("Loyalty", LoyaltySchema);

export default LoyaltyModel;
