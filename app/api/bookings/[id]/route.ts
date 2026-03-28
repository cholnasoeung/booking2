import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid booking id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const existingBooking = await BookingModel.findById(id).lean();

    if (!existingBooking) {
      return Response.json({ message: "Booking not found." }, { status: 404 });
    }

    const isOwner = String(existingBooking.userId) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json(
        { message: "You are not allowed to cancel this booking." },
        { status: 403 }
      );
    }

    if (existingBooking.status === "cancelled") {
      return Response.json(
        { message: "This booking has already been cancelled." },
        { status: 400 }
      );
    }

    const cancelledBooking = await BookingModel.findOneAndUpdate(
      {
        _id: id,
        status: "confirmed",
      },
      {
        status: "cancelled",
      },
      {
        new: true,
      }
    );

    if (!cancelledBooking) {
      return Response.json(
        { message: "Unable to cancel this booking right now." },
        { status: 409 }
      );
    }

    await BusModel.findByIdAndUpdate(cancelledBooking.busId, {
      $pullAll: {
        bookedSeats: cancelledBooking.seats,
      },
    });

    return Response.json({ message: "Booking cancelled successfully." });
  } catch {
    return Response.json(
      { message: "Unable to cancel your booking right now." },
      { status: 500 }
    );
  }
}
