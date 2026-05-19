import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import WaitingListModel from "@/models/WaitingList";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const entries = await WaitingListModel.find({
      user: session.user.id,
      status: { $in: ["active", "notified"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const busIds = entries.map((e) => e.bus);
    const buses = await BusModel.find({ _id: { $in: busIds } }).lean();
    const busMap = new Map(buses.map((b) => [String(b._id), b]));

    const routeIds = buses.map((b) => b.routeId).filter(Boolean);
    const routes = await RouteModel.find({ _id: { $in: routeIds } }).lean();
    const routeMap = new Map(routes.map((r) => [String(r._id), r]));

    const serialized = entries.map((entry) => {
      const bus = busMap.get(String(entry.bus));
      const route = bus ? routeMap.get(String(bus.routeId)) : null;
      return {
        id: String(entry._id),
        status: entry.status,
        requestedSeats: entry.requestedSeats,
        requestedDate: entry.requestedDate,
        requestedDepartureTime: entry.requestedDepartureTime,
        notes: entry.notes ?? null,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        bus: bus
          ? {
              id: String(bus._id),
              from: (route as any)?.from ?? "—",
              to: (route as any)?.to ?? "—",
              departureTime: bus.departureTime,
              date: bus.date,
            }
          : null,
      };
    });

    return Response.json({ entries: serialized });
  } catch (error) {
    console.error("Error fetching user waitlist:", error);
    return Response.json({ message: "Unable to fetch waitlist" }, { status: 500 });
  }
}
