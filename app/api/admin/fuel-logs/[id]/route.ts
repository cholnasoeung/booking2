import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import FuelLogModel from "@/models/operations/FuelLog";

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
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.busDetailId)  update.busDetailId   = body.busDetailId;
  if (body.driverId)     update.driverId       = body.driverId;
  if (body.date)         update.date           = new Date(body.date);
  if (body.liters)       update.liters         = Number(body.liters);
  if (body.pricePerLiter) update.pricePerLiter = Number(body.pricePerLiter);
  await connectToDatabase();

  if (body.liters || body.pricePerLiter) {
    const existing = await FuelLogModel.findById(id).lean() as any;
    const l = Number(body.liters)        || existing?.liters        || 0;
    const p = Number(body.pricePerLiter) || existing?.pricePerLiter || 0;
    update.totalCost = Math.round(l * p * 100) / 100;
  }
  if (body.odometer !== undefined) update.odometer = body.odometer ? Number(body.odometer) : undefined;
  if (body.station  !== undefined) update.station  = body.station?.trim()  || undefined;
  if (body.notes    !== undefined) update.notes    = body.notes?.trim()    || undefined;

  const log = await FuelLogModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("busDetailId", "name registrationNumber")
    .populate("driverId", "name")
    .lean() as any;

  if (!log) return Response.json({ message: "Log not found" }, { status: 404 });

  return Response.json({
    log: {
      id:            String(log._id),
      busDetailId:   String(log.busDetailId?._id),
      busName:       log.busDetailId?.name ?? "",
      busReg:        log.busDetailId?.registrationNumber ?? "",
      driverId:      String(log.driverId?._id),
      driverName:    log.driverId?.name ?? "",
      date:          log.date,
      liters:        log.liters,
      pricePerLiter: log.pricePerLiter,
      totalCost:     log.totalCost,
      odometer:      log.odometer ?? null,
      station:       log.station ?? null,
      notes:         log.notes ?? null,
      createdAt:     log.createdAt,
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
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  await connectToDatabase();
  const log = await FuelLogModel.findByIdAndDelete(id);
  if (!log) return Response.json({ message: "Log not found" }, { status: 404 });

  return Response.json({ message: "Fuel log deleted" });
}
