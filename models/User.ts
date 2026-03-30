import mongoose, { type Document, Schema } from "mongoose";

export type UserRole = "user" | "admin";

export interface ISavedPassenger {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
  idProof?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  savedPassengers: ISavedPassenger[];
  preferences: {
    preferredSeatType?: string[];
    preferredBusType?: string[];
    notifications: {
      bookingConfirmation: boolean;
      cancellationAlerts: boolean;
      promotionalEmails: boolean;
    };
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedPassengerSchema = new Schema<ISavedPassenger>({
  name: { type: String, required: true },
  age: { type: String, required: true },
  gender: { type: String, enum: ["male", "female", "other"], required: true },
  contactNumber: { type: String, required: true },
  email: String,
  idProof: String,
});

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      index: true,
    },
    passwordResetToken: {
      type: String,
      index: true,
    },
    passwordResetExpires: {
      type: Date,
    },
    savedPassengers: {
      type: [SavedPassengerSchema],
      default: [],
    },
    preferences: {
      preferredSeatType: [String],
      preferredBusType: {
        type: [String],
        enum: ["sleeping_bus", "mini_bus", "car"],
      },
      notifications: {
        bookingConfirmation: { type: Boolean, default: true },
        cancellationAlerts: { type: Boolean, default: true },
        promotionalEmails: { type: Boolean, default: false },
      },
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for common queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Method to check if user can make bookings
UserSchema.methods.canBook = function() {
  return this.isEmailVerified;
};

// Method to add saved passenger
UserSchema.methods.addSavedPassenger = function(passenger: ISavedPassenger) {
  const maxSavedPassengers = 10;
  if (this.savedPassengers.length >= maxSavedPassengers) {
    throw new Error(`Maximum ${maxSavedPassengers} saved passengers allowed`);
  }

  // Check for duplicate
  const isDuplicate = this.savedPassengers.some(
    p => p.name === passenger.name && p.contactNumber === passenger.contactNumber
  );

  if (isDuplicate) {
    throw new Error("Passenger already saved");
  }

  this.savedPassengers.push(passenger);
  return this.save();
};

const UserModel =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default UserModel;
