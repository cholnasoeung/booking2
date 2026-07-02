import { connectToDatabase } from "@/lib/db/mongodb";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";

export const runtime = "nodejs";

export interface SeatLockResult {
  success: boolean;
  bookingId?: string;
  message?: string;
  seats?: string[];
}

/**
 * Attempt to lock seats for a booking with real-time conflict detection
 * This handles concurrent booking attempts atomically
 */
export async function lockSeatsForBooking(
  busId: string,
  seats: string[],
  userId: string,
  bookingData: {
    passengers: any[];
    totalPrice: number;
    discountAmount?: number;
    finalPrice: number;
    promoCode?: string;
  }
): Promise<SeatLockResult> {
  await connectToDatabase();

  // Start a session for atomic operations
  const session = await BusModel.startSession();

  try {
    // Get bus with current seat state
    const bus = await BusModel.findById(busId).session(session);

    if (!bus) {
      throw new Error("Bus not found");
    }

    // Check if seats are available
    const bookedSeats = bus.bookedSeats || [];
    const blockedSeats = bus.blockedSeats || [];
    const unavailableSeats = [...new Set([...bookedSeats, ...blockedSeats])];

    const requestedSeats = seats;
    const unavailableRequestedSeats = requestedSeats.filter(seat =>
      unavailableSeats.includes(seat)
    );

    if (unavailableRequestedSeats.length > 0) {
      return {
        success: false,
        message: `Seats not available: ${unavailableRequestedSeats.join(", ")}`,
        seats: unavailableRequestedSeats,
      };
    }

    // Lock the seats atomically
    const updatedBus = await BusModel.findByIdAndUpdate(
      busId,
      {
        $addToSet: { bookedSeats: { $each: seats } },
      },
      { session, new: true }
    );

    if (!updatedBus) {
      return {
        success: false,
        message: "Unable to lock seats. Please try again.",
      };
    }

    // Commit the session to persist the seat lock
    await session.commitTransaction();

    // Note: The actual booking will be created separately
    // For now, we return a temporary booking ID that can be used to complete the booking
    const tempBookingId = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      bookingId: tempBookingId,
      message: "Seats locked successfully",
      seats,
    };
  } catch (error) {
    // Abort session on error
    await session.abortTransaction();

    console.error("Error locking seats:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to lock seats",
    };
  }
}

/**
 * Release seats back to inventory (called when booking fails or times out)
 */
export async function releaseSeats(
  busId: string,
  seats: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    await connectToDatabase();

    const result = await BusModel.findByIdAndUpdate(busId, {
      $pullAll: { bookedSeats: seats },
    });

    if (!result) {
      return {
        success: false,
        message: "Bus not found",
      };
    }

    return {
      success: true,
      message: "Seats released successfully",
    };
  } catch (error) {
    console.error("Error releasing seats:", error);

    return {
      success: false,
      message: "Unable to release seats",
    };
  }
}

/**
 * Check real-time seat availability
 */
export async function checkSeatAvailability(
  busId: string,
  seats: string[]
): Promise<{
  available: boolean;
  seats: string[];
  unavailableSeats?: string[];
  totalSeats: number;
  bookedSeats: number;
  blockedSeats: number;
}> {
  await connectToDatabase();

  const bus = await BusModel.findById(busId).lean();

  if (!bus) {
    throw new Error("Bus not found");
  }

  // Get all confirmed/pending bookings for this bus
  const bookings = await BookingModel.find({
    bus: busId,
    status: { $in: ["confirmed", "pending"] },
  }).select("seats");

  const bookedSeats = bookings.flatMap(b => (b.seats || []).map(String));
  const blockedSeats = (bus.blockedSeats || []).map(String);

  const unavailableSeats = [...new Set([...bookedSeats, ...blockedSeats])];
  const availableSeats = seats.filter(seat => !unavailableSeats.includes(seat));

  return {
    available: availableSeats.length === seats.length,
    seats: availableSeats,
    unavailableSeats: unavailableSeats.length > 0 ? unavailableSeats : undefined,
    totalSeats: bus.totalSeats || 0,
    bookedSeats: bookedSeats.length,
    blockedSeats: blockedSeats.length,
  };
}

/**
 * Get inventory snapshot for analytics
 */
export async function getInventorySnapshot(busId: string): Promise<{
  busId: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  blockedSeats: number;
  occupancyRate: number;
  revenue: number;
  status: "available" | "limited" | "sold_out" | "blocked";
}> {
  await connectToDatabase();

  const bus = await BusModel.findById(busId).lean();
  const bookings = await BookingModel.find({
    bus: busId,
    status: "confirmed",
  }).lean();

  if (!bus) {
    throw new Error("Bus not found");
  }

  const totalSeats = bus.totalSeats || 0;
  const bookedSeats = bookings.length || 0;
  const blockedSeats = (bus.blockedSeats || []).length;
  const availableSeats = totalSeats - bookedSeats - blockedSeats;
  const occupancyRate = totalSeats > 0 ? bookedSeats / totalSeats : 0;

  // Calculate revenue
  const revenue = bookings.reduce((sum, b) => sum + (b.finalPrice || 0), 0);

  // Determine status
  let status: "available" | "limited" | "sold_out" | "blocked";
  if (blockedSeats >= totalSeats) {
    status = "blocked";
  } else if (availableSeats === 0) {
    status = "sold_out";
  } else if (occupancyRate > 0.8) {
    status = "limited";
  } else {
    status = "available";
  }

  return {
    busId,
    totalSeats,
    bookedSeats,
    availableSeats,
    blockedSeats,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    revenue,
    status,
  };
}

/**
 * Batch check inventory for multiple buses
 */
export async function getBatchInventory(
  busIds: string[]
): Promise<Map<string, Awaited<ReturnType<typeof getInventorySnapshot>>>> {
  const snapshots = await Promise.all(
    busIds.map(id => getInventorySnapshot(id).catch(err => {
      console.error(`Error fetching inventory for ${id}:`, err);
      return null;
    }))
  );

  const map = new Map();

  snapshots.forEach((snapshot, index) => {
    if (snapshot) {
      map.set(busIds[index], snapshot);
    }
  });

  return map;
}
