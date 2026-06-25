import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { sendCancellationEmail } from "@/lib/email-service";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "Service cancelled by operator";

  await connectToDatabase();

  const bus = await BusModel.findById(id).lean();
  if (!bus) return Response.json({ message: "Bus not found" }, { status: 404 });
  if (bus.departureStatus === "cancelled") {
    return Response.json({ message: "Departure is already cancelled" }, { status: 409 });
  }

  const route = await RouteModel.findById(bus.routeId).lean();
  const routeStr = route ? `${route.from} → ${route.to}` : "Unknown Route";
  const dateStr = bus.date instanceof Date
    ? bus.date.toISOString().slice(0, 10)
    : String(bus.date).slice(0, 10);

  // Fetch all active bookings for this bus
  const bookings = await BookingModel.find({
    bus: id,
    status: { $in: ["confirmed", "pending"] },
  })
    .populate("user", "name email")
    .lean() as any[];

  // Cancel bus departure
  await BusModel.findByIdAndUpdate(id, {
    departureStatus: "cancelled",
    statusNote: reason,
  });

  // Cancel all bookings and mark refunded
  const bookingIds = bookings.map((b) => b._id);
  await BookingModel.updateMany(
    { _id: { $in: bookingIds } },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "refunded",
        refundStatus: "processed",
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount: 0, // set per-booking below
      },
    }
  );

  // Set refund amount per booking and send emails
  let emailsSent = 0;
  const totalRefund = bookings.reduce((sum, b) => sum + (b.finalPrice ?? 0), 0);

  await Promise.allSettled(
    bookings.map(async (booking) => {
      await BookingModel.findByIdAndUpdate(booking._id, {
        refundAmount: booking.finalPrice ?? 0,
      });

      const userEmail = booking.user?.email ?? booking.metadata?.guestEmail;
      const userName  = booking.user?.name  ?? booking.metadata?.guestName ?? "Passenger";
      if (userEmail) {
        const result = await sendCancellationEmail(userEmail, {
          customerName: userName,
          bookingId: String(booking._id),
          route: routeStr,
          date: `${dateStr} ${bus.departureTime}`,
          cancellationReason: reason,
          refundAmount: booking.finalPrice ?? 0,
          refundStatus: "processed",
        });
        if (result.success) emailsSent++;
      }
    })
  );

  return Response.json({
    message: "Departure cancelled successfully",
    affectedBookings: bookings.length,
    totalRefund,
    emailsSent,
  });
}

// Preview — GET returns affected bookings count & refund total without cancelling
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  await connectToDatabase();

  const bus = await BusModel.findById(id).lean();
  if (!bus) return Response.json({ message: "Bus not found" }, { status: 404 });

  const route = await RouteModel.findById(bus.routeId).lean();

  const bookings = await BookingModel.find({
    bus: id,
    status: { $in: ["confirmed", "pending"] },
  })
    .populate("user", "name email")
    .lean() as any[];

  const totalRefund = bookings.reduce((sum, b) => sum + (b.finalPrice ?? 0), 0);
  const passengers = bookings.map((b) => ({
    name:  b.user?.name  ?? b.metadata?.guestName  ?? "Guest",
    email: b.user?.email ?? b.metadata?.guestEmail ?? null,
    seats: b.seats ?? [],
    finalPrice: b.finalPrice ?? 0,
  }));

  return Response.json({
    busId: id,
    route: route ? `${route.from} → ${route.to}` : "Unknown",
    date: bus.date instanceof Date ? bus.date.toISOString().slice(0, 10) : String(bus.date).slice(0, 10),
    departureTime: bus.departureTime,
    departureStatus: bus.departureStatus,
    affectedBookings: bookings.length,
    totalRefund,
    passengers,
  });
}
