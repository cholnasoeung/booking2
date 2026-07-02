import mongoose, { type Document, Schema } from "mongoose";

export type PromoCodeType = "percentage" | "fixed" | "free_ticket";

export interface IPromoCode extends Document {
  code: string;
  type: PromoCodeType;
  value: number; // Percentage (0-100) or fixed amount
  maxUses?: number;
  usedCount: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  applicableRoutes?: string[]; // Route IDs this applies to (empty = all routes)
  applicableBusTypes?: string[]; // Bus types this applies to (empty = all)
  isActive: boolean;
  title?: string | null;
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
  calculateDiscount(bookingAmount: number): {
    valid: boolean;
    discount: number;
    message: string;
  };
  incrementUsage(): Promise<IPromoCode>;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed", "free_ticket"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    maxUses: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minBookingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    applicableRoutes: {
      type: [Schema.Types.ObjectId],
      ref: "Route",
      default: [],
    },
    applicableBusTypes: {
      type: [String],
      enum: ["bus_45", "mini_bus", "car", "sleeper_30", "sleeper_40"],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying active promo codes
PromoCodeSchema.index({ code: 1, isActive: 1 });

// Method to check if promo code is valid
PromoCodeSchema.methods.isValid = function () {
  const now = new Date();

  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validUntil >= now &&
    (this.maxUses === null || this.usedCount < this.maxUses)
  );
};

// Method to apply promo code
PromoCodeSchema.methods.calculateDiscount = function (bookingAmount: number) {
  if (!this.isValid()) {
    return { valid: false, discount: 0, message: "Promo code is not valid" };
  }

  if (bookingAmount < (this.minBookingAmount || 0)) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum booking amount ${this.minBookingAmount} required`,
    };
  }

  let discount = 0;

  switch (this.type) {
    case "percentage":
      discount = (bookingAmount * this.value) / 100;
      break;
    case "fixed":
      discount = this.value;
      break;
    case "free_ticket":
      discount = bookingAmount;
      break;
  }

  // Apply max discount cap if set
  if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
    discount = this.maxDiscountAmount;
  }

  // Ensure discount doesn't exceed booking amount
  discount = Math.min(discount, bookingAmount);

  return {
    valid: true,
    discount,
    message: `Promo code applied: ${this.code}`,
  };
};

// Method to increment usage
PromoCodeSchema.methods.incrementUsage = async function () {
  this.usedCount += 1;
  return this.save();
};

const PromoCodeModel =
  (mongoose.models.PromoCode as mongoose.Model<IPromoCode>) ||
  mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCodeModel;
