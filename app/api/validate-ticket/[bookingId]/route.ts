import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";
import UserModel from "@/models/User";

export const runtime = "nodejs";

// Public endpoint — bus staff scan QR, no auth required
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  if (!isValidObjectId(bookingId)) {
    return Response.json({ valid: false, message: "Invalid ticket ID." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const booking = await BookingModel.findById(bookingId).lean();

    if (!booking) {
      return Response.json({ valid: false, message: "Ticket not found." }, { status: 404 });
    }

    const bus = await BusModel.findById(booking.bus).lean();
    const route = bus ? await RouteModel.findById(bus.routeId).lean() : null;
    const user = await UserModel.findById(booking.user).select("name email").lean();

    const travelDate = bus?.date ? new Date(bus.date).toISOString().split("T")[0] : null;
    const isConfirmed = (booking as any).status === "confirmed";
    const isCancelled = (booking as any).status === "cancelled";

    return Response.json({
      valid: isConfirmed,
      status: (booking as any).status,
      bookingId: String(booking._id),
      passenger: user
        ? { name: (user as any).name, email: (user as any).email }
        : { name: "Unknown", email: "" },
      route: route
        ? { from: (route as any).from, to: (route as any).to }
        : null,
      seats: (booking as any).seats ?? [],
      travelDate,
      departureTime: bus?.departureTime ?? null,
      boardingStop: (booking as any).boardingStop ?? null,
      message: isConfirmed
        ? "Valid ticket — welcome aboard!"
        : isCancelled
        ? "This ticket has been cancelled."
        : "Ticket is not confirmed.",
    });
  } catch (error) {
    console.error("Ticket validation error:", error);
    return Response.json({ valid: false, message: "Unable to validate ticket." }, { status: 500 });
  }
}
