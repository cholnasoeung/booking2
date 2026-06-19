import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BookingModel from "@/models/Booking";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "";

  await connectToDatabase();

  if (action === "bookings") {
    const bookings = await BookingModel.find({})
      .populate("user", "name email")
      .populate({
        path: "bus",
        populate: { path: "routeId", select: "from to" },
      })
      .sort({ createdAt: -1 })
      .lean() as any[];

    const rows = bookings.map((b) => ({
      BookingID: String(b._id),
      Status: b.status,
      CustomerName: b.user?.name ?? "",
      CustomerEmail: b.user?.email ?? "",
      From: b.bus?.routeId?.from ?? "",
      To: b.bus?.routeId?.to ?? "",
      TravelDate: b.bus?.date ? new Date(b.bus.date).toISOString().slice(0, 10) : "",
      DepartureTime: b.bus?.departureTime ?? "",
      Seats: (b.seats ?? []).join(" | "),
      Passengers: b.passengers?.length ?? 0,
      TotalPrice: b.totalPrice ?? 0,
      BookedAt: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 19).replace("T", " ") : "",
      CancelledAt: b.cancelledAt ? new Date(b.cancelledAt).toISOString().slice(0, 19).replace("T", " ") : "",
      CancellationReason: b.cancellationReason ?? "",
    }));

    const csv = toCsv(rows);
    const filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (action === "routes") {
    const routes = await RouteModel.find({}).sort({ from: 1 }).lean() as any[];
    const rows = routes.map((r) => ({
      RouteID: String(r._id),
      From: r.from,
      To: r.to,
      Distance_km: r.distance,
      Duration: r.duration,
      CreatedAt: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
    }));
    const csv = toCsv(rows);
    const filename = `routes-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(JSON.stringify({ message: "Unknown action" }), { status: 400 });
}
