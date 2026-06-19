import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BusModel, { type BusDepartureStatus } from "@/models/Bus";

export const runtime = "nodejs";

const VALID_STATUSES: BusDepartureStatus[] = [
  "scheduled", "on_time", "delayed", "departed", "arrived", "cancelled",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body?.status === "string" ? body.status : "";
  const delayMinutes = typeof body?.delayMinutes === "number" ? body.delayMinutes : 0;
  const statusNote = typeof body?.statusNote === "string" ? body.statusNote.trim() : "";

  if (!VALID_STATUSES.includes(status as BusDepartureStatus)) {
    return Response.json({ message: "Invalid status value" }, { status: 400 });
  }

  await connectToDatabase();

  const bus = await BusModel.findByIdAndUpdate(
    id,
    { departureStatus: status, delayMinutes, statusNote },
    { new: true }
  ).select("departureStatus delayMinutes statusNote");

  if (!bus) {
    return Response.json({ message: "Bus not found" }, { status: 404 });
  }

  return Response.json({ departureStatus: bus.departureStatus, delayMinutes: bus.delayMinutes, statusNote: bus.statusNote });
}
