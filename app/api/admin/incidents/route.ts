import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import IncidentModel from "@/models/Incident";
import BusDetailModel from "@/models/BusDetail";
import { isValidObjectId } from "@/lib/validation";

const INCIDENT_TYPES = ["breakdown", "accident", "flat_tire", "engine_failure", "electrical", "flood_damage", "other"];
const SEVERITIES     = ["low", "medium", "high"];

export async function GET(req: Request) {
  await requireAdmin("/");
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const busDetailId = searchParams.get("busDetailId");
  const status      = searchParams.get("status");
  const limit       = Math.min(Number(searchParams.get("limit") ?? 100), 200);
  const skip        = Number(searchParams.get("skip") ?? 0);

  const filter: Record<string, unknown> = {};
  if (busDetailId && isValidObjectId(busDetailId)) filter.busDetailId = busDetailId;
  if (status === "open" || status === "resolved")  filter.status      = status;

  const [incidents, total] = await Promise.all([
    IncidentModel.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("busDetailId", "name registrationNumber")
      .lean(),
    IncidentModel.countDocuments(filter),
  ]);

  return Response.json({ incidents, total });
}

export async function POST(req: Request) {
  await requireAdmin("/");

  const body = await req.json();
  const { busDetailId, date, incidentType, severity, location, description, resolution, cost, reportedBy } = body;

  if (!isValidObjectId(busDetailId)) return Response.json({ message: "Invalid vehicle ID" }, { status: 400 });
  if (!date)                          return Response.json({ message: "Date is required" },       { status: 400 });
  if (!INCIDENT_TYPES.includes(incidentType)) return Response.json({ message: "Invalid incident type" }, { status: 400 });
  if (!SEVERITIES.includes(severity))         return Response.json({ message: "Invalid severity" },      { status: 400 });
  if (!location?.trim())   return Response.json({ message: "Location is required" },    { status: 400 });
  if (!description?.trim()) return Response.json({ message: "Description is required" }, { status: 400 });

  await connectToDatabase();

  const vehicle = await BusDetailModel.findById(busDetailId).lean();
  if (!vehicle) return Response.json({ message: "Vehicle not found" }, { status: 404 });

  const incident = await IncidentModel.create({
    busDetailId,
    date: new Date(date),
    incidentType,
    severity,
    location: location.trim(),
    description: description.trim(),
    resolution:  resolution?.trim() ?? "",
    status:      resolution?.trim() ? "resolved" : "open",
    cost:        cost != null ? Number(cost) : undefined,
    reportedBy:  reportedBy?.trim() ?? "",
  });

  return Response.json({ incident }, { status: 201 });
}
