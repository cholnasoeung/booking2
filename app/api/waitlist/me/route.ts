import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import WaitingListModel from "@/models/WaitingList";

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
      .populate("bus", "departureTime arrivalTime")
      .populate("route", "from to")
      .sort({ createdAt: -1 })
      .lean();

    const result = entries.map((entry: any) => ({
      id: String(entry._id),
      busId: String(entry.bus?._id ?? entry.bus),
      routeFrom: entry.route?.from ?? "",
      routeTo: entry.route?.to ?? "",
      departureTime: entry.bus?.departureTime ?? entry.requestedDepartureTime,
      requestedDate: entry.requestedDate,
      requestedSeats: entry.requestedSeats,
      status: entry.status,
      notifiedAt: entry.notifiedAt?.toISOString() ?? null,
      notificationExpiresAt: entry.notificationExpiresAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    }));

    return Response.json({ entries: result });
  } catch (error) {
    console.error("Error fetching user waitlist:", error);
    return Response.json({ message: "Unable to fetch waitlist" }, { status: 500 });
  }
}
