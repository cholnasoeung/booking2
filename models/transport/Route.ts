import mongoose, { type Document, Schema } from "mongoose";

export interface IRoute extends Document {
  from: string;
  to: string;
  duration: string;
  distance: number;
}

const RouteSchema = new Schema<IRoute>({
  from: {
    type: String,
    required: true,
    trim: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: String,
    required: true,
    trim: true,
  },
  distance: {
    type: Number,
    required: true,
    min: 1,
  },
});

RouteSchema.index({ from: 1, to: 1 });

const RouteModel =
  (mongoose.models.Route as mongoose.Model<IRoute>) ||
  mongoose.model<IRoute>("Route", RouteSchema);

export default RouteModel;
