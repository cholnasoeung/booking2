import mongoose, { type Document, Schema } from "mongoose";

export type PricingRuleType = "seasonal" | "holiday" | "weekend" | "event" | "early_bird" | "last_minute";
export type PricingRuleScope = "all" | "route" | "bus_type";

export interface IPricingRule extends Document {
  name:         string;
  type:         PricingRuleType;
  scope:        PricingRuleScope;
  routeId?:     mongoose.Types.ObjectId;
  busType?:     string;
  startDate:    Date;
  endDate:      Date;
  multiplier:   number;   // e.g. 1.3 = +30%, 0.9 = -10%
  isActive:     boolean;
  priority:     number;   // higher = applied first when multiple rules overlap
  description?: string;
  createdAt:    Date;
  updatedAt:    Date;
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    name:        { type: String, required: true, trim: true },
    type:        { type: String, enum: ["seasonal", "holiday", "weekend", "event", "early_bird", "last_minute"], required: true },
    scope:       { type: String, enum: ["all", "route", "bus_type"], default: "all" },
    routeId:     { type: Schema.Types.ObjectId, ref: "Route" },
    busType:     { type: String, trim: true },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true },
    multiplier:  { type: Number, required: true, min: 0.1, max: 10 },
    isActive:    { type: Boolean, default: true },
    priority:    { type: Number, default: 1, min: 1 },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

PricingRuleSchema.index({ startDate: 1, endDate: 1 });
PricingRuleSchema.index({ isActive: 1, priority: -1 });
PricingRuleSchema.index({ routeId: 1 });

export default (mongoose.models.PricingRule as mongoose.Model<IPricingRule>) ||
  mongoose.model<IPricingRule>("PricingRule", PricingRuleSchema);
