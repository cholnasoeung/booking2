import mongoose, { type Document, Schema } from "mongoose";

export interface IRating extends Document {
  user: mongoose.Types.ObjectId;
  bus: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  rating: number; // 1-5 stars
  review?: string;
  aspects: {
    punctuality: number; // 1-5
    cleanliness: number; // 1-5
    staffBehavior: number; // 1-5
    comfort: number; // 1-5
  };
  wouldRecommend: boolean;
  isVerified: boolean; // True if user actually took the trip
  response?: string; // Operator response
  responseDate?: Date;
  helpful: number; // Number of users who found this helpful
  notHelpful: number; // Number of users who found this not helpful
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
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
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: 1000,
    },
    aspects: {
      punctuality: { type: Number, min: 1, max: 5, default: 5 },
      cleanliness: { type: Number, min: 1, max: 5, default: 5 },
      staffBehavior: { type: Number, min: 1, max: 5, default: 5 },
      comfort: { type: Number, min: 1, max: 5, default: 5 },
    },
    wouldRecommend: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    response: {
      type: String,
      maxlength: 500,
    },
    responseDate: {
      type: Date,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
RatingSchema.index({ bus: 1, status: 1 });
RatingSchema.index({ user: 1, booking: 1 }, { unique: true });
RatingSchema.index({ createdAt: -1 });

// Virtual for average aspect rating
RatingSchema.virtual('averageAspectRating').get(function() {
  const aspects = this.aspects;
  return (aspects.punctuality + aspects.cleanliness + aspects.staffBehavior + aspects.comfort) / 4;
});

// Static method to get bus rating summary
RatingSchema.statics.getBusRatingSummary = async function(busId: string) {
  const result = await this.aggregate([
    { $match: { bus: new mongoose.Types.ObjectId(busId), status: "approved" } },
    {
      $group: {
        _id: "$bus",
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
        ratingDistribution: {
          $push: "$rating",
        },
      },
    },
    {
      $project: {
        averageRating: { $round: ["$averageRating", 1] },
        totalRatings: 1,
        rating5: {
          $size: {
            $filter: {
              input: "$ratingDistribution",
              cond: { $eq: ["$$this", 5] },
            },
          },
        },
        rating4: {
          $size: {
            $filter: {
              input: "$ratingDistribution",
              cond: { $eq: ["$$this", 4] },
            },
          },
        },
        rating3: {
          $size: {
            $filter: {
              input: "$ratingDistribution",
              cond: { $eq: ["$$this", 3] },
            },
          },
        },
        rating2: {
          $size: {
            $filter: {
              input: "$ratingDistribution",
              cond: { $eq: ["$$this", 2] },
            },
          },
        },
        rating1: {
          $size: {
            $filter: {
              input: "$ratingDistribution",
              cond: { $eq: ["$$this", 1] },
            },
          },
        },
      },
    },
  ]);

  return result[0] || {
    averageRating: 0,
    totalRatings: 0,
    rating5: 0,
    rating4: 0,
    rating3: 0,
    rating2: 0,
    rating1: 0,
  };
};

// Instance method to mark as helpful
RatingSchema.methods.markHelpful = async function(userId: string) {
  if (!this.helpfulUsers) {
    (this as any).helpfulUsers = [];
  }

  if (!(this as any).helpfulUsers.includes(userId)) {
    this.helpful += 1;
    (this as any).helpfulUsers.push(userId);
    await this.save();
  }

  return this;
};

const RatingModel =
  (mongoose.models.Rating as mongoose.Model<IRating>) ||
  mongoose.model<IRating>("Rating", RatingSchema);

export default RatingModel;
