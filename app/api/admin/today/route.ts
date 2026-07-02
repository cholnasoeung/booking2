import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import UserModel from "@/models/user/User";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  // Today's UTC date range
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const todayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const todayDateStr = todayStart.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const [bookings, departures, newUsersCount] = await Promise.all([
    // Bookings created today
    BookingModel.find({ createdAt: { $gte: todayStart, $lte: todayEnd } })
      .populate("user", "name email")
      .populate({
        path: "bus",
        populate: { path: "routeId", select: "from to" },
      })
      .sort({ createdAt: -1 })
      .lean(),

    // Buses departing today
    BusModel.find({ date: { $gte: todayStart, $lte: todayEnd } })
      .populate("driverId", "name phone")
      .sort({ departureTime: 1 })
      .lean(),

    // Users who joined today
    UserModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
  ]) as [any[], any[], number];

  // Stats
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const revenue = confirmed.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  const totalPassengers = confirmed.reduce(
    (sum, b) => sum + (b.passengers?.length || b.seats?.length || 0),
    0
  );

  // Hourly breakdown (0-23)
  const hourlyMap = new Map<number, { count: number; revenue: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { count: 0, revenue: 0 });
  bookings.forEach((b) => {
    const hour = new Date(b.createdAt).getUTCHours();
    const entry = hourlyMap.get(hour)!;
    entry.count += 1;
    if (b.status === "confirmed") entry.revenue += b.totalPrice ?? 0;
  });
  const hourlyBookings = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    count: data.count,
    revenue: data.revenue,
  }));

  // Serialize bookings
  const serializedBookings = bookings.map((b) => ({
    id: String(b._id),
    status: b.status,
    createdAt: b.createdAt,
    totalPrice: b.totalPrice ?? 0,
    seats: b.seats ?? [],
    passengerCount: b.passengers?.length || b.seats?.length || 0,
    user: b.user
      ? { id: String(b.user._id), name: b.user.name, email: b.user.email }
      : null,
    route: b.bus?.routeId
      ? { from: b.bus.routeId.from, to: b.bus.routeId.to }
      : null,
    departureTime: b.bus?.departureTime ?? null,
    busNumber: b.bus?.busNumber ?? null,
  }));

  // Serialize departures
  const serializedDepartures = (departures as any[]).map((bus) => ({
    id: String(bus._id),
    busNumber: bus.busNumber ?? null,
    departureTime: bus.departureTime,
    arrivalTime: bus.arrivalTime,
    totalSeats: bus.totalSeats,
    bookedCount: (bus.bookedSeats ?? []).length,
    departureStatus: bus.departureStatus ?? "scheduled",
    delayMinutes: bus.delayMinutes ?? 0,
    driver: bus.driverId
      ? { name: (bus.driverId as any).name, phone: (bus.driverId as any).phone }
      : null,
    route: null as { from: string; to: string } | null, // populated below if needed
  }));

  // Populate route names for departures via routeId
  const busWithRoute = await BusModel.find({
    date: { $gte: todayStart, $lte: todayEnd },
  })
    .populate("routeId", "from to")
    .select("routeId departureTime")
    .lean() as any[];

  const routeMap = new Map<string, { from: string; to: string }>();
  busWithRoute.forEach((b) => {
    if (b.routeId) {
      routeMap.set(String(b._id), { from: b.routeId.from, to: b.routeId.to });
    }
  });

  serializedDepartures.forEach((d) => {
    d.route = routeMap.get(d.id) ?? null;
  });

  return Response.json({
    todayDate: todayDateStr,
    generatedAt: now.toISOString(),
    stats: {
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: cancelled.length,
      revenue,
      totalPassengers,
      newUsers: newUsersCount,
      totalDepartures: departures.length,
    },
    bookings: serializedBookings,
    departures: serializedDepartures,
    hourlyBookings,
  });
}
