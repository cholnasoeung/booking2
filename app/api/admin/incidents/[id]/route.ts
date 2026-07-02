import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import IncidentModel from "@/models/operations/Incident";
import { isValidObjectId } from "@/lib/utils/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const allowedFields = ["date", "incidentType", "severity", "location", "description", "resolution", "status", "cost", "reportedBy"];

  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "date") {
        update.date = new Date(body.date);
      } else if (field === "cost") {
        update.cost = body.cost != null ? Number(body.cost) : undefined;
      } else if (typeof body[field] === "string") {
        update[field] = body[field].trim();
      } else {
        update[field] = body[field];
      }
    }
  }

  // Auto-set status to resolved when resolution is provided
  if (update.resolution && typeof update.resolution === "string" && update.resolution.trim() && !body.status) {
    update.status = "resolved";
  }

  await connectToDatabase();

  const incident = await IncidentModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    .populate("busDetailId", "name registrationNumber")
    .lean();

  if (!incident) return Response.json({ message: "Incident not found" }, { status: 404 });
  return Response.json({ incident });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const result = await IncidentModel.findByIdAndDelete(id);
  if (!result) return Response.json({ message: "Incident not found" }, { status: 404 });
  return Response.json({ message: "Incident deleted" });
}
