import mongoose, { Schema, type Document } from "mongoose";

export interface IPageView extends Document {
  page: string;
  referrer: string;
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
  sessionId: string;
  country: string;
  createdAt: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    page:      { type: String, required: true, trim: true },
    referrer:  { type: String, default: "direct" },
    device:    { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    browser:   { type: String, default: "Other" },
    os:        { type: String, default: "Other" },
    sessionId: { type: String, required: true },
    country:   { type: String, default: "Unknown" },
  },
  { timestamps: true }
);

// Indexes for fast aggregation queries
PageViewSchema.index({ createdAt: -1 });
PageViewSchema.index({ page: 1, createdAt: -1 });
PageViewSchema.index({ device: 1, createdAt: -1 });

export default (mongoose.models.PageView as mongoose.Model<IPageView>) ||
  mongoose.model<IPageView>("PageView", PageViewSchema);
