import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import DriverScheduleModel from "@/models/hr/DriverSchedule";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();

  const body   = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.driverId    !== undefined) update.driverId    = body.driverId;
  if (body.busDetailId !== undefined) update.busDetailId = body.busDetailId;
  if (body.busId       !== undefined) update.busId       = body.busId || undefined;
  if (body.date        !== undefined) update.date        = new Date(body.date);
  if (body.shiftStart  !== undefined) update.shiftStart  = body.shiftStart;
  if (body.shiftEnd    !== undefined) update.shiftEnd    = body.shiftEnd;
  if (body.status      !== undefined) update.status      = body.status;
  if (body.notes       !== undefined) update.notes       = body.notes?.trim() || undefined;

  const schedule = await DriverScheduleModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("driverId",    "name phone")
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  if (!schedule) return Response.json({ message: "Schedule not found" }, { status: 404 });

  return Response.json({
    schedule: {
      id:          String(schedule._id),
      driverId:    String(schedule.driverId?._id),
      driverName:  schedule.driverId?.name  ?? "",
      driverPhone: schedule.driverId?.phone ?? "",
      busDetailId: String(schedule.busDetailId?._id),
      busName:     schedule.busDetailId?.name ?? "",
      busReg:      schedule.busDetailId?.registrationNumber ?? "",
      busId:       schedule.busId ? String(schedule.busId) : null,
      date:        schedule.date,
      shiftStart:  schedule.shiftStart,
      shiftEnd:    schedule.shiftEnd,
      status:      schedule.status,
      notes:       schedule.notes ?? null,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const s = await DriverScheduleModel.findByIdAndDelete(id);
  if (!s) return Response.json({ message: "Schedule not found" }, { status: 404 });

  return Response.json({ message: "Schedule deleted" });
}
