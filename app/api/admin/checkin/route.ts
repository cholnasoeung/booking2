import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

// GET — load all departures for a date, or bookings for a specific bus
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const busId = searchParams.get("busId");
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  // If no busId — return list of departures for the date
  if (!busId) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const buses = await BusModel.find({ date: { $gte: dayStart, $lte: dayEnd } })
      .populate("routeId", "from to")
      .sort({ departureTime: 1 })
      .lean() as any[];

    // Get booking counts per bus
    const busIds = buses.map((b) => b._id);
    const bookings = await BookingModel.find({
      bus: { $in: busIds },
      status: "confirmed",
    })
      .select("bus checkInStatus seats")
      .lean() as any[];

    const statsMap = new Map<string, { total: number; checkedIn: number; boarded: number; noShow: number }>();
    bookings.forEach((bk) => {
      const key = String(bk.bus);
      if (!statsMap.has(key)) statsMap.set(key, { total: 0, checkedIn: 0, boarded: 0, noShow: 0 });
      const s = statsMap.get(key)!;
      s.total++;
      if (bk.checkInStatus === "checked-in") s.checkedIn++;
      if (bk.checkInStatus === "boarded") s.boarded++;
      if (bk.checkInStatus === "no-show") s.noShow++;
    });

    return Response.json({
      date,
      departures: buses.map((b) => {
        const stats = statsMap.get(String(b._id)) ?? { total: 0, checkedIn: 0, boarded: 0, noShow: 0 };
        return {
          id: String(b._id),
          from: b.routeId?.from ?? "—",
          to: b.routeId?.to ?? "—",
          departureTime: b.departureTime,
          arrivalTime: b.arrivalTime,
          busType: b.busType,
          totalSeats: b.totalSeats,
          bookedCount: stats.total,
          checkedIn: stats.checkedIn,
          boarded: stats.boarded,
          noShow: stats.noShow,
          departureStatus: b.departureStatus ?? "scheduled",
        };
      }),
    });
  }

  // busId provided — return full passenger list for that bus
  const bookings = await BookingModel.find({
    bus: busId,
    status: "confirmed",
  })
    .populate("user", "name email phone")
    .sort({ createdAt: 1 })
    .lean() as any[];

  return Response.json({
    busId,
    passengers: bookings.map((bk) => {
      const primaryPassenger = bk.passengers?.[0];
      const guestName = bk.metadata?.guestName;
      const name = primaryPassenger?.name || guestName || bk.user?.name || "Unknown";
      const phone = primaryPassenger?.contactNumber || bk.metadata?.guestPhone || bk.user?.phone || "";
      const email = primaryPassenger?.email || bk.metadata?.guestEmail || bk.user?.email || "";
      return {
        id: String(bk._id),
        name,
        phone,
        email,
        seats: bk.seats ?? [],
        checkInStatus: (["pending","checked-in","boarded","no-show"].includes(bk.checkInStatus) ? bk.checkInStatus : "pending") as string,
        checkedInAt: bk.checkedInAt ?? null,
        checkedInBy: bk.checkedInBy ?? null,
        boardingStop: bk.boardingStop ?? null,
        bookingSource: bk.metadata?.bookingSource ?? "web",
        createdAt: bk.createdAt,
      };
    }),
  });
}
