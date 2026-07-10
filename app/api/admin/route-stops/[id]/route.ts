import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import RouteStopModel from "@/models/transport/RouteStop";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, city, arrivalOffset, order, isPickup, isDrop, address, landmark, lat, lng } = body;

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (name)                         update.name          = name.trim();
  if (city)                         update.city          = city.trim();
  if (arrivalOffset !== undefined)  update.arrivalOffset = Number(arrivalOffset);
  if (order !== undefined)          update.order         = Number(order);
  if (isPickup !== undefined)       update.isPickup      = isPickup;
  if (isDrop !== undefined)         update.isDrop        = isDrop;
  if (address !== undefined)        update.address       = address?.trim() || undefined;
  if (landmark !== undefined)       update.landmark      = landmark?.trim() || undefined;
  if (lat !== undefined)            update.lat           = lat ? Number(lat) : undefined;
  if (lng !== undefined)            update.lng           = lng ? Number(lng) : undefined;

  const updated = await RouteStopModel.findByIdAndUpdate(params.id, update, { new: true }).lean() as any;
  if (!updated) return Response.json({ message: "Not found." }, { status: 404 });

  return Response.json({ stop: { id: String(updated._id), ...updated } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  const stop = await RouteStopModel.findByIdAndDelete(params.id).lean() as any;
  if (stop) {
    // Close the gap left by deleted stop
    await RouteStopModel.updateMany(
      { routeId: stop.routeId, order: { $gt: stop.order } },
      { $inc: { order: -1 } }
    );
  }
  return Response.json({ message: "Deleted." });
}
