import mongoose, { Schema, type Document } from "mongoose";

export type LostFoundCategory =
  | "bag" | "electronics" | "clothing" | "documents"
  | "jewelry" | "money" | "keys" | "other";

export type LostFoundStatus =
  | "reported" | "under_review" | "found" | "returned" | "not_found" | "closed";

export interface ILostFound extends Document {
  refNumber: string;
  reportedBy?: mongoose.Types.ObjectId;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  bookingId?: mongoose.Types.ObjectId;
  busId?: mongoose.Types.ObjectId;
  routeId?: mongoose.Types.ObjectId;
  travelDate?: Date;
  seatNumber?: string;
  itemName: string;
  itemCategory: LostFoundCategory;
  itemDescription: string;
  color?: string;
  brand?: string;
  lastSeenLocation?: string;
  status: LostFoundStatus;
  adminNotes?: string;
  foundLocation?: string;
  handledBy?: string;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LostFoundSchema = new Schema<ILostFound>(
  {
    refNumber:        { type: String, required: true, unique: true, index: true },
    reportedBy:       { type: Schema.Types.ObjectId, ref: "User",    index: true },
    reporterName:     { type: String, required: true, trim: true },
    reporterEmail:    { type: String, required: true, trim: true, lowercase: true },
    reporterPhone:    { type: String, trim: true },
    bookingId:        { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    busId:            { type: Schema.Types.ObjectId, ref: "Bus",     index: true },
    routeId:          { type: Schema.Types.ObjectId, ref: "Route" },
    travelDate:       { type: Date },
    seatNumber:       { type: String, trim: true },
    itemName:         { type: String, required: true, trim: true },
    itemCategory:     {
      type: String,
      enum: ["bag","electronics","clothing","documents","jewelry","money","keys","other"],
      required: true,
    },
    itemDescription:  { type: String, required: true, trim: true },
    color:            { type: String, trim: true },
    brand:            { type: String, trim: true },
    lastSeenLocation: { type: String, trim: true },
    status:           {
      type: String,
      enum: ["reported","under_review","found","returned","not_found","closed"],
      default: "reported",
      index: true,
    },
    adminNotes:       { type: String, trim: true },
    foundLocation:    { type: String, trim: true },
    handledBy:        { type: String, trim: true },
    returnedAt:       { type: Date },
  },
  { timestamps: true }
);

LostFoundSchema.index({ createdAt: -1 });
LostFoundSchema.index({ status: 1, createdAt: -1 });

export default (mongoose.models.LostFound as mongoose.Model<ILostFound>) ||
  mongoose.model<ILostFound>("LostFound", LostFoundSchema);
