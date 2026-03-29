import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeBusSeatLayout } from "@/lib/seat-layout";
import { parseSeatSelection, isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const busId = typeof body?.busId === "string" ? body.busId : "";
    const seats = parseSeatSelection(body?.seats);

    if (!isValidObjectId(busId) || !seats) {
      return Response.json(
        { message: "Please choose a bus and at least one seat." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const busDocument = await BusModel.findById(busId);

    if (!busDocument) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    const normalizedBus = normalizeBusSeatLayout(busDocument.toObject());

    busDocument.busType = normalizedBus.busType;
    busDocument.seatLayout = normalizedBus.seatLayout;
    busDocument.totalSeats = normalizedBus.totalSeats;
    busDocument.bookedSeats = normalizedBus.bookedSeats;
    await busDocument.save();

    const invalidSeat = seats.find((seat) => !normalizedBus.seatCodes.includes(seat));

    if (invalidSeat) {
      return Response.json(
        { message: `Seat ${invalidSeat} does not exist on this bus.` },
        { status: 400 }
      );
    }

    const updatedBus = await BusModel.findOneAndUpdate(
      {
        _id: busId,
        bookedSeats: {
          $nin: seats,
        },
      },
      {
        $addToSet: {
          bookedSeats: {
            $each: seats,
          },
        },
      },
      {
        new: true,
      }
    );

    if (!updatedBus) {
      return Response.json(
        { message: "One or more selected seats were just booked by another user." },
        { status: 409 }
      );
    }

    const booking = await BookingModel.create({
      user: session.user.id,
      bus: busId,
      seats,
      passengers: [], // Will be filled in passenger details step
      totalPrice: seats.length * busDocument.pricePerSeat,
      status: "confirmed",
    });

    return Response.json(
      {
        message: "Booking confirmed.",
        bookingId: String(booking._id),
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { message: "Unable to complete your booking right now." },
      { status: 500 }
    );
  }
}
