import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import MaintenanceModel from "@/models/operations/Maintenance";

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
  const update: Record<string, unknown> = {};

  if (body.busDetailId         !== undefined) update.busDetailId         = body.busDetailId;
  if (body.maintenanceType     !== undefined) update.maintenanceType     = body.maintenanceType;
  if (body.status              !== undefined) update.status              = body.status;
  if (body.date                !== undefined) update.date                = new Date(body.date);
  if (body.cost                !== undefined) update.cost                = Number(body.cost);
  if (body.workshop            !== undefined) update.workshop            = body.workshop?.trim() || undefined;
  if (body.odometer            !== undefined) update.odometer            = body.odometer ? Number(body.odometer) : undefined;
  if (body.nextServiceDate     !== undefined) update.nextServiceDate     = body.nextServiceDate ? new Date(body.nextServiceDate) : undefined;
  if (body.nextServiceOdometer !== undefined) update.nextServiceOdometer = body.nextServiceOdometer ? Number(body.nextServiceOdometer) : undefined;
  if (body.description         !== undefined) update.description         = body.description?.trim();
  if (body.notes               !== undefined) update.notes               = body.notes?.trim() || undefined;

  const record = await MaintenanceModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  if (!record) return Response.json({ message: "Record not found" }, { status: 404 });

  return Response.json({
    record: {
      id:                  String(record._id),
      busDetailId:         String(record.busDetailId?._id),
      busName:             record.busDetailId?.name ?? "",
      busReg:              record.busDetailId?.registrationNumber ?? "",
      maintenanceType:     record.maintenanceType,
      status:              record.status,
      date:                record.date,
      cost:                record.cost,
      workshop:            record.workshop ?? null,
      odometer:            record.odometer ?? null,
      nextServiceDate:     record.nextServiceDate ?? null,
      nextServiceOdometer: record.nextServiceOdometer ?? null,
      description:         record.description,
      notes:               record.notes ?? null,
      createdAt:           record.createdAt,
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
  const record = await MaintenanceModel.findByIdAndDelete(id);
  if (!record) return Response.json({ message: "Record not found" }, { status: 404 });

  return Response.json({ message: "Record deleted" });
}
