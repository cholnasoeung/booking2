import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const bookingIds: string[] = Array.isArray(body?.bookingIds) ? body.bookingIds : [];
  const reason: string =
    typeof body?.reason === "string" ? body.reason.trim() : "Bulk cancelled by admin";

  if (bookingIds.length === 0) {
    return Response.json({ message: "No booking IDs provided" }, { status: 400 });
  }

  const invalid = bookingIds.filter((id) => !isValidObjectId(id));
  if (invalid.length > 0) {
    return Response.json({ message: "Some booking IDs are invalid" }, { status: 400 });
  }

  await connectToDatabase();

  const bookings = await BookingModel.find({
    _id: { $in: bookingIds },
    status: "confirmed",
  }).lean();

  let cancelled = 0;
  const failed: string[] = [];

  for (const booking of bookings) {
    try {
      await BookingModel.findByIdAndUpdate(booking._id, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: new Date(),
      });

      await BusModel.findByIdAndUpdate(booking.bus, {
        $pull: { bookedSeats: { $in: booking.seats } },
      });

      cancelled++;
    } catch {
      failed.push(String(booking._id));
    }
  }

  return Response.json({ cancelled, failed, total: bookingIds.length });
}
