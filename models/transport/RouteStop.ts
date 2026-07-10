import mongoose, { type Document, Schema } from "mongoose";

export interface IRouteStop extends Document {
  routeId:      mongoose.Types.ObjectId;
  name:         string;        // "Kampot Station"
  city:         string;        // "Kampot"
  arrivalOffset: number;       // minutes after departure (0 = origin)
  order:        number;        // 0 = origin, last = destination
  isPickup:     boolean;       // passengers can board here
  isDrop:       boolean;       // passengers can alight here
  address?:     string;
  landmark?:    string;
  lat?:         number;
  lng?:         number;
  createdAt:    Date;
  updatedAt:    Date;
}

const RouteStopSchema = new Schema<IRouteStop>(
  {
    routeId:       { type: Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    name:          { type: String, required: true, trim: true },
    city:          { type: String, required: true, trim: true },
    arrivalOffset: { type: Number, required: true, min: 0, default: 0 },
    order:         { type: Number, required: true, min: 0 },
    isPickup:      { type: Boolean, default: true },
    isDrop:        { type: Boolean, default: true },
    address:       { type: String, trim: true },
    landmark:      { type: String, trim: true },
    lat:           { type: Number },
    lng:           { type: Number },
  },
  { timestamps: true }
);

RouteStopSchema.index({ routeId: 1, order: 1 });

export default (mongoose.models.RouteStop as mongoose.Model<IRouteStop>) ||
  mongoose.model<IRouteStop>("RouteStop", RouteStopSchema);
