"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { connectToDatabase } from "@/lib/mongodb";
import { normalizeBusSeatLayout } from "@/lib/seat-layout";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import UserModel from "@/models/User";
import { authOptions } from "@/lib/auth";
import type { Passenger } from "@/components/passenger-details-form";

type CreateBookingInput = {
  busId: string;
  userId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
};

type CreateBookingResult = {
  id: string;
  busId: string;
  userId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
  status: string;
  createdAt: Date;
};

export async function createBooking(input: CreateBookingInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("You must be logged in to make a booking");
  }

  if (session.user.id !== input.userId) {
    throw new Error("You can only create bookings for your own account");
  }

  await connectToDatabase();

  // Get bus with current seat availability
  const bus = await BusModel.findById(input.busId);

  if (!bus) {
    throw new Error("Bus not found");
  }

  // Normalize seat layout
  const layout = normalizeBusSeatLayout(bus);

  // Validate all selected seats exist and are available
  const invalidSeats = input.seats.filter(
    seat => !layout.seatCodes.includes(seat)
  );

  if (invalidSeats.length > 0) {
    throw new Error(
      `Invalid seat codes: ${invalidSeats.join(", ")}`
    );
  }

  // Check if seats are already booked
  const newlyBookedSeats = input.seats.filter(seat =>
    layout.bookedSeats.includes(seat)
  );

  if (newlyBookedSeats.length > 0) {
    throw new Error(
      `Seats ${newlyBookedSeats.join(", ")} are already booked`
    );
  }

  // Check if seats exceed available seats
  if (bus.totalSeats - bus.bookedSeats.length < input.seats.length) {
    throw new Error("Not enough seats available");
  }

  // Create booking
  const booking = await BookingModel.create({
    bus: bus.id,
    user: input.userId,
    seats: input.seats,
    passengers: input.passengers,
    totalPrice: input.totalPrice,
    status: "confirmed",
  });

  // Update bus with new booked seats
  await BusModel.findByIdAndUpdate(bus.id, {
    $addToSet: { bookedSeats: { $each: input.seats } },
  });

  // Revalidate pages
  revalidatePath("/book/[busId]");
  revalidatePath("/dashboard");
  revalidatePath("/booking/confirmation/[bookingId]");

  // Return created booking
  const result: CreateBookingResult = {
    id: booking.id,
    busId: booking.bus.toString(),
    userId: booking.user.toString(),
    seats: booking.seats,
    passengers: booking.passengers as unknown as Passenger[],
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
  };

  return result;
}

type CancelBookingInput = {
  bookingId: string;
  userId: string;
  reason?: string;
};

export async function cancelBooking(input: CancelBookingInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("You must be logged in to cancel a booking");
  }

  await connectToDatabase();

  // Get booking
  const booking = await BookingModel.findById(input.bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Check ownership
  if (booking.user.toString() !== input.userId) {
    throw new Error("You can only cancel your own bookings");
  }

  // Check if already cancelled
  if (booking.status === "cancelled") {
    throw new Error("Booking is already cancelled");
  }

  // Update booking status
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancellationReason = input.reason;
  await booking.save();

  // Remove seats from bus bookedSeats
  const bus = await BusModel.findById(booking.bus);

  if (bus) {
    bus.bookedSeats = bus.bookedSeats.filter(
      seat => !input.bookingId || !booking.seats.includes(seat)
    );

    // Re-filter properly
    bus.bookedSeats = bus.bookedSeats.filter(
      seat => !booking.seats.includes(seat)
    );

    await bus.save();
  }

  // Revalidate pages
  revalidatePath("/dashboard");
  revalidatePath("/booking/confirmation/[bookingId]");

  return { success: true, bookingId: booking.id };
}

type UpdateUserProfileInput = {
  userId: string;
  name?: string;
  phone?: string;
};

export async function updateUserProfile(input: UpdateUserProfileInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("You must be logged in to update your profile");
  }

  if (session.user.id !== input.userId) {
    throw new Error("You can only update your own profile");
  }

  await connectToDatabase();

  const updateData: Partial<{
    name: string;
    phone: string;
  }> = {};

  if (input.name) {
    updateData.name = input.name;
  }

  if (input.phone) {
    updateData.phone = input.phone;
  }

  const user = await UserModel.findByIdAndUpdate(
    input.userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!user) {
    throw new Error("User not found");
  }

  // Revalidate dashboard
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}
