import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import BusModel from "@/models/transport/Bus";
import BookingModel from "@/models/booking/Booking";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus id." }, { status: 400 });
  }

  await connectToDatabase();

  const bus = await BusModel.findById(id)
    .populate({ path: "routeId", select: "from to distance duration" })
    .lean() as any;

  if (!bus) return Response.json({ message: "Bus not found." }, { status: 404 });

  const bookings = await BookingModel.find({ bus: id, status: { $in: ["confirmed", "checked_in"] } })
    .populate("user", "name email phone")
    .sort({ createdAt: 1 })
    .lean() as any[];

  const passengers: {
    seat: string; name: string; age: number | null; gender: string;
    contactNumber: string; email: string; bookingId: string;
    checkedIn: boolean;
  }[] = [];

  for (const booking of bookings) {
    const passengerList: any[] = booking.passengers ?? [];
    const seats: string[]      = booking.seats ?? [];

    if (passengerList.length > 0) {
      passengerList.forEach((p, i) => {
        passengers.push({
          seat:          seats[i] ?? "—",
          name:          p.name  ?? booking.user?.name ?? "Guest",
          age:           p.age   ?? null,
          gender:        p.gender ?? "—",
          contactNumber: p.contactNumber ?? booking.user?.phone ?? "—",
          email:         p.email ?? booking.user?.email ?? "—",
          bookingId:     String(booking._id).slice(-6).toUpperCase(),
          checkedIn:     booking.status === "checked_in",
        });
      });
    } else {
      seats.forEach(seat => {
        passengers.push({
          seat,
          name:          booking.user?.name  ?? "Guest",
          age:           null,
          gender:        "—",
          contactNumber: booking.user?.phone ?? "—",
          email:         booking.user?.email ?? "—",
          bookingId:     String(booking._id).slice(-6).toUpperCase(),
          checkedIn:     booking.status === "checked_in",
        });
      });
    }
  }

  passengers.sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }));

  return Response.json({
    bus: {
      id:            String(bus._id),
      from:          bus.routeId?.from   ?? "—",
      to:            bus.routeId?.to     ?? "—",
      date:          bus.date,
      departureTime: bus.departureTime,
      arrivalTime:   bus.arrivalTime,
      busType:       bus.busType,
      totalSeats:    bus.totalSeats ?? 0,
      bookedCount:   bus.bookedSeats?.length ?? 0,
    },
    passengers,
    totalPassengers: passengers.length,
    checkedIn:       passengers.filter(p => p.checkedIn).length,
  });
}
