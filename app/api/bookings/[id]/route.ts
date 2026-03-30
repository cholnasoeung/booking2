import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeBusSeatLayout, normalizeStoredSeatCodes } from "@/lib/seat-layout";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import { sendCancellationEmail } from "@/lib/email-service";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
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
    let cancellationReason: string | undefined;

    try {
      const body = await request.json();
      if (typeof body?.reason === "string" && body.reason.trim()) {
        cancellationReason = body.reason.trim();
      }
    } catch {
      cancellationReason = undefined;
    }

    await connectToDatabase();

    const existingBooking = await BookingModel.findById(id).populate('user');

    if (!existingBooking) {
      return Response.json({ message: "Booking not found." }, { status: 404 });
    }

    const isOwner = String(existingBooking.user._id) === session.user.id;
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

    if (existingBooking.status === "refunded") {
      return Response.json(
        { message: "This booking has already been refunded." },
        { status: 400 }
      );
    }

    // Use the model's cancel method which includes refund calculation
    const cancelledBooking = await existingBooking.cancel(cancellationReason || "Customer requested cancellation");

    // Release seats back to inventory
    const bus = await BusModel.findById(cancelledBooking.bus);
    if (bus) {
      await BusModel.findByIdAndUpdate(cancelledBooking.bus, {
        $pullAll: { bookedSeats: cancelledBooking.seats },
      });
    }

    // Send cancellation email
    if (existingBooking.user) {
      const route = (bus as any)?.routeId;
      const routeStr = route ? `${route.from} to ${route.to}` : "Unknown Route";

      await sendCancellationEmail((existingBooking.user as any).email, {
        customerName: (existingBooking.user as any).name,
        bookingId: String(cancelledBooking._id),
        route: routeStr,
        date: bus ? bus.date.toISOString().split('T')[0] : "N/A",
        cancellationReason: cancellationReason || "Customer requested cancellation",
        refundAmount: cancelledBooking.refundAmount || undefined,
        refundStatus: cancelledBooking.refundStatus || undefined,
      }).catch(err => console.error('Failed to send cancellation email:', err));
    }

    return Response.json({
      message: "Booking cancelled successfully.",
      refundAmount: cancelledBooking.refundAmount,
      refundStatus: cancelledBooking.refundStatus,
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    const message = error instanceof Error ? error.message : "Unable to cancel your booking right now.";

    // Check if it's a validation error from the cancel method
    if (message.includes("already cancelled") || message.includes("already refunded")) {
      return Response.json({ message }, { status: 400 });
    }

    return Response.json({ message }, { status: 500 });
  }
}
