import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import DriverEarningModel from "@/models/hr/DriverEarning";

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

  const body = await request.json().catch(() => ({}));
  const existing = await DriverEarningModel.findById(id).lean() as any;
  if (!existing) return Response.json({ message: "Entry not found" }, { status: 404 });

  const rt  = body.regularTrips  !== undefined ? Math.max(0, Number(body.regularTrips))  : existing.regularTrips;
  const ot  = body.overtimeTrips !== undefined ? Math.max(0, Number(body.overtimeTrips)) : existing.overtimeTrips;
  const bp  = body.basePay       !== undefined ? Number(body.basePay)       : existing.basePay;
  const otr = body.overtimeRate  !== undefined ? Number(body.overtimeRate)  : existing.overtimeRate;

  const regularEarnings  = Math.round(rt * bp * 100) / 100;
  const overtimeEarnings = Math.round(ot * bp * otr * 100) / 100;
  const totalEarnings    = Math.round((regularEarnings + overtimeEarnings) * 100) / 100;

  const update: Record<string, unknown> = {
    regularTrips:     rt,
    overtimeTrips:    ot,
    basePay:          bp,
    overtimeRate:     otr,
    regularEarnings,
    overtimeEarnings,
    totalEarnings,
  };
  if (body.driverId   !== undefined) update.driverId   = body.driverId;
  if (body.busDetailId !== undefined) update.busDetailId = body.busDetailId || undefined;
  if (body.date       !== undefined) update.date       = new Date(body.date);
  if (body.notes      !== undefined) update.notes      = body.notes?.trim() || undefined;

  const updated = await DriverEarningModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("driverId",    "name")
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  return Response.json({
    entry: {
      id:               String(updated._id),
      driverId:         String(updated.driverId?._id),
      driverName:       updated.driverId?.name ?? "",
      busDetailId:      updated.busDetailId ? String(updated.busDetailId?._id) : null,
      busName:          updated.busDetailId?.name ?? null,
      busReg:           updated.busDetailId?.registrationNumber ?? null,
      date:             updated.date,
      regularTrips:     updated.regularTrips,
      overtimeTrips:    updated.overtimeTrips,
      basePay:          updated.basePay,
      overtimeRate:     updated.overtimeRate,
      regularEarnings:  updated.regularEarnings,
      overtimeEarnings: updated.overtimeEarnings,
      totalEarnings:    updated.totalEarnings,
      notes:            updated.notes ?? null,
      createdAt:        updated.createdAt,
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
  const entry = await DriverEarningModel.findByIdAndDelete(id);
  if (!entry) return Response.json({ message: "Entry not found" }, { status: 404 });

  return Response.json({ message: "Entry deleted" });
}
