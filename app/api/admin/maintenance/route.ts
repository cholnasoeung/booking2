import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import MaintenanceModel from "@/models/Maintenance";
import BusDetailModel from "@/models/BusDetail";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const busId = searchParams.get("busId") ?? "";
  const type  = searchParams.get("type")  ?? "";
  const month = searchParams.get("month") ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (busId) filter.busDetailId       = busId;
  if (type)  filter.maintenanceType   = type;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [total, records, buses, summaryRaw, monthlyRaw, upcomingRaw, byTypeRaw] = await Promise.all([
    MaintenanceModel.countDocuments(filter),

    MaintenanceModel.find(filter)
      .populate("busDetailId", "name registrationNumber")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    BusDetailModel.find().select("name registrationNumber").sort({ name: 1 }).lean(),

    // This-month summary
    MaintenanceModel.aggregate([
      { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, totalCost: { $sum: "$cost" }, count: { $sum: 1 } } },
    ]),

    // Last 6 months — cost by month
    MaintenanceModel.aggregate([
      { $match: { date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$maintenanceType" },
        totalCost: { $sum: "$cost" },
        count:     { $sum: 1 },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Upcoming services (nextServiceDate in the future)
    MaintenanceModel.find({ nextServiceDate: { $gte: now } })
      .populate("busDetailId", "name registrationNumber")
      .sort({ nextServiceDate: 1 })
      .limit(5)
      .lean(),

    // Cost breakdown by type (all time)
    MaintenanceModel.aggregate([
      { $group: { _id: "$maintenanceType", totalCost: { $sum: "$cost" }, count: { $sum: 1 } } },
      { $sort: { totalCost: -1 } },
    ]),
  ]);

  const summary = summaryRaw[0] ?? { totalCost: 0, count: 0 };

  // Build monthly chart — fill all 6 months, group types per month
  const monthMap: Record<string, Record<string, number>> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = {};
  }
  for (const r of monthlyRaw as any[]) {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
    if (monthMap[key]) monthMap[key][r._id.type] = (monthMap[key][r._id.type] ?? 0) + r.totalCost;
  }
  const monthly = Object.entries(monthMap).map(([key, types]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      label:       new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "2-digit" }),
      total:       Object.values(types).reduce((a, b) => a + b, 0),
      oil_change:  types.oil_change  ?? 0,
      tire:        types.tire        ?? 0,
      brake:       types.brake       ?? 0,
      engine:      types.engine      ?? 0,
      inspection:  types.inspection  ?? 0,
      electrical:  types.electrical  ?? 0,
      bodywork:    types.bodywork    ?? 0,
      other:       types.other       ?? 0,
    };
  });

  return Response.json({
    records: (records as any[]).map((r) => ({
      id:                  String(r._id),
      busDetailId:         String(r.busDetailId?._id ?? r.busDetailId),
      busName:             r.busDetailId?.name ?? "Unknown",
      busReg:              r.busDetailId?.registrationNumber ?? "",
      maintenanceType:     r.maintenanceType,
      status:              r.status,
      date:                r.date,
      cost:                r.cost,
      workshop:            r.workshop ?? null,
      odometer:            r.odometer ?? null,
      nextServiceDate:     r.nextServiceDate ?? null,
      nextServiceOdometer: r.nextServiceOdometer ?? null,
      description:         r.description,
      notes:               r.notes ?? null,
      createdAt:           r.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      thisMonthCost:  Math.round(summary.totalCost * 100) / 100,
      thisMonthCount: summary.count,
    },
    monthly,
    upcoming: (upcomingRaw as any[]).map((r) => ({
      id:              String(r._id),
      busName:         r.busDetailId?.name ?? "Unknown",
      busReg:          r.busDetailId?.registrationNumber ?? "",
      maintenanceType: r.maintenanceType,
      nextServiceDate: r.nextServiceDate,
      nextServiceOdometer: r.nextServiceOdometer ?? null,
    })),
    byType: (byTypeRaw as any[]).map((r) => ({
      type:      r._id,
      totalCost: Math.round(r.totalCost * 100) / 100,
      count:     r.count,
    })),
    buses: (buses as any[]).map((b) => ({ id: String(b._id), name: b.name, reg: b.registrationNumber })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { busDetailId, maintenanceType, status, date, cost, workshop,
          odometer, nextServiceDate, nextServiceOdometer, description, notes } = body;

  if (!busDetailId || !maintenanceType || !date || cost === undefined || !description?.trim()) {
    return Response.json({ message: "Vehicle, type, date, cost and description are required." }, { status: 400 });
  }

  const costN = Number(cost);
  if (isNaN(costN) || costN < 0) {
    return Response.json({ message: "Cost must be a non-negative number." }, { status: 400 });
  }

  await connectToDatabase();

  const record = await MaintenanceModel.create({
    busDetailId,
    maintenanceType,
    status:              status ?? "completed",
    date:                new Date(date),
    cost:                costN,
    workshop:            workshop?.trim()    || undefined,
    odometer:            odometer            ? Number(odometer)            : undefined,
    nextServiceDate:     nextServiceDate     ? new Date(nextServiceDate)   : undefined,
    nextServiceOdometer: nextServiceOdometer ? Number(nextServiceOdometer) : undefined,
    description:         description.trim(),
    notes:               notes?.trim()       || undefined,
  });

  const populated = await MaintenanceModel.findById(record._id)
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  return Response.json({
    record: {
      id:              String(populated._id),
      busDetailId:     String(populated.busDetailId?._id),
      busName:         populated.busDetailId?.name ?? "",
      busReg:          populated.busDetailId?.registrationNumber ?? "",
      maintenanceType: populated.maintenanceType,
      status:          populated.status,
      date:            populated.date,
      cost:            populated.cost,
      workshop:        populated.workshop ?? null,
      odometer:        populated.odometer ?? null,
      nextServiceDate: populated.nextServiceDate ?? null,
      nextServiceOdometer: populated.nextServiceOdometer ?? null,
      description:     populated.description,
      notes:           populated.notes ?? null,
      createdAt:       populated.createdAt,
    },
  }, { status: 201 });
}
