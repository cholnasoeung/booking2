"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { connectToDatabase } from "@/lib/db/mongodb";
import { normalizeBusSeatLayout } from "@/lib/seat/seat-layout";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import RouteModel from "@/models/transport/Route";
import UserModel from "@/models/user/User";
import NotificationModel from "@/models/communication/Notification";
import { authOptions } from "@/lib/auth";
import type { Passenger } from "@/types/passenger";

type CreateBookingInput = {
  busId: string;
  userId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
  promoCode?: string;
  boardingStop?: string;
  droppingStop?: string;
};

type CreateBookingResult = {
  id: string;
  busId: string;
  userId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
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

  // Apply promo code discount if provided
  let discountAmount = 0;
  let finalPrice = input.totalPrice;
  let appliedPromoCode: string | undefined;

  if (input.promoCode) {
    const PromoCodeModel = (await import("@/models/commerce/PromoCode")).default;
    const promoCode = await PromoCodeModel.findOne({
      code: input.promoCode.toUpperCase(),
      isActive: true,
    });

    if (promoCode && promoCode.isValid()) {
      const discountResult = promoCode.calculateDiscount(input.totalPrice);
      if (discountResult.valid) {
        discountAmount = discountResult.discount || 0;
        finalPrice = input.totalPrice - discountAmount;
        appliedPromoCode = promoCode.code;

        // Increment promo code usage
        await promoCode.incrementUsage();
      }
    }
  }

  // Create booking
  const booking = await BookingModel.create({
    bus: bus.id,
    user: input.userId,
    seats: input.seats,
    passengers: input.passengers,
      totalPrice: input.totalPrice,
      discountAmount,
      finalPrice,
      promoCode: appliedPromoCode,
      boardingStop: input.boardingStop,
      droppingStop: input.droppingStop,
      status: "confirmed",
    });

  // Update bus with new booked seats
  await BusModel.findByIdAndUpdate(bus.id, {
    $addToSet: { bookedSeats: { $each: input.seats } },
  });

  // In-app notification
  try {
    const route = await RouteModel.findById(bus.routeId).lean() as any;
    const routeStr = route ? `${route.from} → ${route.to}` : "Bus Ticket";
    await NotificationModel.create({
      userId: input.userId,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      message: `Your booking for ${routeStr} has been confirmed. ${input.seats.length} seat(s) reserved.`,
      busId: String(bus.id),
      bookingId: String(booking.id),
    });
  } catch { /* non-fatal */ }

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
    discountAmount: booking.discountAmount,
    finalPrice: booking.finalPrice,
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
    bus.bookedSeats = bus.bookedSeats.filter(seat => 
      typeof seat !== "string" || !booking.seats.includes(seat)
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
