import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import { normalizeStoredSeatCodes } from "@/lib/seat-layout";

export const runtime = "nodejs";

// POST modify booking (change seats, date, etc.)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to modify booking" }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid booking ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = body?.action; // "changeSeats" | "changeDate" | "upgradeBus"

    await connectToDatabase();

    const booking = await BookingModel.findById(id).populate('bus');

    if (!booking) {
      return Response.json({ message: "Booking not found" }, { status: 404 });
    }

    const isOwner = String(booking.user) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json(
        { message: "You are not authorized to modify this booking" },
        { status: 403 }
      );
    }

    if (booking.status !== "confirmed") {
      return Response.json(
        { message: "Only confirmed bookings can be modified" },
        { status: 400 }
      );
    }

    const bus = booking.bus as any;

    // Calculate modification fee based on timing
    const now = new Date();
    const departure = new Date(`${bus.date.toISOString().split('T')[0]}T${bus.departureTime}`);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 4) {
      return Response.json(
        { message: "Modifications not allowed within 4 hours of departure" },
        { status: 400 }
      );
    }

    let modificationFee = 0;
    if (hoursUntilDeparture < 24) {
      modificationFee = booking.finalPrice * 0.05; // 5% fee
    }

    if (action === "changeSeats") {
      const newSeats = body?.seats;

      if (!Array.isArray(newSeats) || newSeats.length === 0) {
        return Response.json({ message: "Please select new seats" }, { status: 400 });
      }

      if (newSeats.length !== booking.seats.length) {
        return Response.json({ message: "Number of seats must remain the same" }, { status: 400 });
      }

      // Check seat availability
      const unavailableSeats = newSeats.filter(seat =>
        bus.bookedSeats.includes(seat) && !booking.seats.includes(seat)
      );

      if (unavailableSeats.length > 0) {
        return Response.json({
          message: "Some seats are not available",
          unavailableSeats,
        }, { status: 409 });
      }

      // Release old seats and book new ones
      await BusModel.findByIdAndUpdate(booking.bus, {
        $pullAll: { bookedSeats: booking.seats },
        $addToSet: { bookedSeats: { $each: newSeats } },
      });

      booking.seats = newSeats;
      await booking.save();

      return Response.json({
        message: "Seats changed successfully",
        modificationFee,
        newSeats,
      });

    } else if (action === "changeDate") {
      const newDate = body?.date;
      const newBusId = body?.newBusId;

      if (!newDate || !isValidObjectId(newBusId)) {
        return Response.json({ message: "Invalid date or bus" }, { status: 400 });
      }

      const newBus = await BusModel.findById(newBusId);

      if (!newBus) {
        return Response.json({ message: "New bus not found" }, { status: 404 });
      }

      // Check seat availability on new bus
        if (!newBus.seatLayout) {
          return Response.json(
            { message: "Seat layout data missing for the target bus" },
            { status: 400 }
          );
        }

        const normalizedSeats = normalizeStoredSeatCodes(booking.seats, newBus.seatLayout);
      const unavailableSeats = normalizedSeats.filter(seat =>
        newBus.bookedSeats.includes(seat)
      );

      if (unavailableSeats.length > 0) {
        return Response.json({
          message: "Selected seats are not available on the new bus",
          unavailableSeats,
        }, { status: 409 });
      }

      // Release seats from old bus and book on new bus
      await BusModel.findByIdAndUpdate(booking.bus, {
        $pullAll: { bookedSeats: booking.seats },
      });

      await BusModel.findByIdAndUpdate(newBusId, {
        $addToSet: { bookedSeats: { $each: normalizedSeats } },
      });

      booking.bus = newBusId;
      booking.seats = normalizedSeats;

      // Recalculate pricing
      const newTotalPrice = booking.seats.length * newBus.pricePerSeat;
      booking.totalPrice = newTotalPrice;
      booking.finalPrice = newTotalPrice + modificationFee;

      await booking.save();

      return Response.json({
        message: "Date changed successfully",
        modificationFee,
        newTotal: booking.finalPrice,
        newBus: {
          id: newBus._id,
          date: newBus.date,
          departureTime: newBus.departureTime,
          arrivalTime: newBus.arrivalTime,
        },
      });

    } else {
      return Response.json({ message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Booking modification error:", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Unable to modify booking" },
      { status: 500 }
    );
  }
}
