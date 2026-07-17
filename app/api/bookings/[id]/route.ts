import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import WaitingListModel from "@/models/booking/WaitingList";
import { sendCancellationEmail, sendWaitlistNotificationEmail } from "@/lib/services/email-service";
import { sendCancellationSMS } from "@/lib/services/sms-service";

export const runtime = "nodejs";

// Admin-only: mark a pending payment (e.g. "pay on boarding") as collected.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid booking id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.paymentStatus !== "paid") {
    return Response.json({ message: "Only marking a booking as paid is supported here." }, { status: 400 });
  }

  await connectToDatabase();

  const booking = await BookingModel.findByIdAndUpdate(
    id,
    { $set: { paymentStatus: "paid" } },
    { new: true }
  ).lean() as any;

  if (!booking) {
    return Response.json({ message: "Booking not found." }, { status: 404 });
  }

  return Response.json({ message: "Payment marked as collected.", paymentStatus: booking.paymentStatus });
}

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
    const bus = await BusModel.findById(cancelledBooking.bus).populate("routeId");
    if (bus) {
      await BusModel.findByIdAndUpdate(cancelledBooking.bus, {
        $pullAll: { bookedSeats: cancelledBooking.seats },
      });

      // Notify waitlisted users now that seats are free
      const seatsFreed = cancelledBooking.seats.length;
      const notified = await WaitingListModel.notifyUsers(String(bus._id), seatsFreed).catch(() => []);
      if (notified.length > 0) {
        const route = (bus as any).routeId;
        const routeStr = route ? `${route.from} → ${route.to}` : "your waitlisted route";
        const travelDate = bus.date ? new Date(bus.date).toLocaleDateString("en-US", { dateStyle: "medium" }) : "";
        for (const n of notified) {
          sendWaitlistNotificationEmail(n.userEmail, {
            userName: n.userName,
            route: routeStr,
            date: travelDate,
            seatsAvailable: seatsFreed,
            busId: String(bus._id),
          }).catch(() => {});
        }
      }
    }

    // Send cancellation email
    if (existingBooking.user) {
      const route = (bus as any)?.routeId;
      const routeStr = route ? `${route.from} to ${route.to}` : "Unknown Route";

      const userRef = existingBooking.user as any;
      await sendCancellationEmail(userRef.email, {
        customerName: userRef.name,
        bookingId: String(cancelledBooking._id),
        route: routeStr,
        date: bus ? bus.date.toISOString().split('T')[0] : "N/A",
        cancellationReason: cancellationReason || "Customer requested cancellation",
        refundAmount: cancelledBooking.refundAmount || undefined,
        refundStatus: cancelledBooking.refundStatus || undefined,
      }).catch(err => console.error('Failed to send cancellation email:', err));

      if (userRef.phone) {
        sendCancellationSMS(userRef.phone, {
          customerName: userRef.name,
          bookingId: String(cancelledBooking._id),
          route: routeStr,
        }).catch(() => {});
      }
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
