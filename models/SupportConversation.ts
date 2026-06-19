import mongoose, { type Document, Schema } from "mongoose";

export interface ISupportMessage {
  sender: "user" | "admin";
  text: string;
  createdAt: Date;
}

export interface ISupportConversation extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  status: "open" | "resolved" | "closed";
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    sender: { type: String, enum: ["user", "admin"], required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SupportConversationSchema = new Schema<ISupportConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, maxlength: 200 },
    status: { type: String, enum: ["open", "resolved", "closed"], default: "open" },
    messages: [SupportMessageSchema],
  },
  { timestamps: true }
);

SupportConversationSchema.index({ user: 1, createdAt: -1 });
SupportConversationSchema.index({ status: 1 });

const SupportConversationModel =
  (mongoose.models.SupportConversation as mongoose.Model<ISupportConversation>) ||
  mongoose.model<ISupportConversation>("SupportConversation", SupportConversationSchema);

export default SupportConversationModel;
