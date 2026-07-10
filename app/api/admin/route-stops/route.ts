import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import RouteStopModel from "@/models/transport/RouteStop";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId") ?? "";

  await connectToDatabase();

  const [routes, stops] = await Promise.all([
    RouteModel.find().sort({ from: 1, to: 1 }).lean(),
    routeId
      ? RouteStopModel.find({ routeId }).sort({ order: 1 }).lean()
      : RouteStopModel.find().sort({ routeId: 1, order: 1 }).lean(),
  ]);

  return Response.json({
    stops: (stops as any[]).map((s) => ({
      id:            String(s._id),
      routeId:       String(s.routeId),
      name:          s.name,
      city:          s.city,
      arrivalOffset: s.arrivalOffset,
      order:         s.order,
      isPickup:      s.isPickup,
      isDrop:        s.isDrop,
      address:       s.address ?? null,
      landmark:      s.landmark ?? null,
      lat:           s.lat ?? null,
      lng:           s.lng ?? null,
    })),
    routes: routes.map((r: any) => ({
      id:   String(r._id),
      from: r.from,
      to:   r.to,
      label: `${r.from} → ${r.to}`,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { routeId, name, city, arrivalOffset, order, isPickup, isDrop, address, landmark, lat, lng } = body;

  if (!routeId || !name?.trim() || !city?.trim()) {
    return Response.json({ message: "routeId, name, and city are required." }, { status: 400 });
  }

  await connectToDatabase();

  // Shift orders if inserting at a position
  const orderNum = Number(order ?? 0);
  await RouteStopModel.updateMany(
    { routeId, order: { $gte: orderNum } },
    { $inc: { order: 1 } }
  );

  const stop = await RouteStopModel.create({
    routeId, name: name.trim(), city: city.trim(),
    arrivalOffset: Number(arrivalOffset ?? 0),
    order: orderNum,
    isPickup: isPickup !== false,
    isDrop:   isDrop   !== false,
    address:  address?.trim()  || undefined,
    landmark: landmark?.trim() || undefined,
    lat:      lat  ? Number(lat)  : undefined,
    lng:      lng  ? Number(lng)  : undefined,
  });

  return Response.json({
    stop: { id: String(stop._id), ...stop.toObject() },
  }, { status: 201 });
}
