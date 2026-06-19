import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import FuelLogModel from "@/models/FuelLog";
import BusDetailModel from "@/models/BusDetail";
import DriverModel from "@/models/Driver";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = 20;
  const busId     = searchParams.get("busId") ?? "";
  const driverId  = searchParams.get("driverId") ?? "";
  const month     = searchParams.get("month") ?? ""; // "2026-06"

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (busId)    filter.busDetailId = busId;
  if (driverId) filter.driverId    = driverId;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = {
      $gte: new Date(y, m - 1, 1),
      $lt:  new Date(y, m, 1),
    };
  }

  // This month range for summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [total, logs, buses, drivers, summaryRaw, monthlyRaw] = await Promise.all([
    FuelLogModel.countDocuments(filter),

    FuelLogModel.find(filter)
      .populate("busDetailId", "name registrationNumber")
      .populate("driverId", "name")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    BusDetailModel.find().select("name registrationNumber").sort({ name: 1 }).lean(),
    DriverModel.find({ status: "active" }).select("name").sort({ name: 1 }).lean(),

    // Summary: this month's stats
    FuelLogModel.aggregate([
      { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: {
        _id: null,
        totalCost:   { $sum: "$totalCost" },
        totalLiters: { $sum: "$liters" },
        count:       { $sum: 1 },
      }},
    ]),

    // Monthly chart: last 6 months
    FuelLogModel.aggregate([
      { $match: { date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        totalCost:   { $sum: "$totalCost" },
        totalLiters: { $sum: "$liters" },
        count:       { $sum: 1 },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const summary = summaryRaw[0] ?? { totalCost: 0, totalLiters: 0, count: 0 };

  const monthly = monthlyRaw.map((m: any) => ({
    month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
    label: new Date(m._id.year, m._id.month - 1).toLocaleString("en-US", { month: "short", year: "2-digit" }),
    totalCost:   Math.round(m.totalCost * 100) / 100,
    totalLiters: Math.round(m.totalLiters * 100) / 100,
    count:       m.count,
  }));

  return Response.json({
    logs: (logs as any[]).map((l) => ({
      id:            String(l._id),
      busDetailId:   String(l.busDetailId?._id ?? l.busDetailId),
      busName:       l.busDetailId?.name ?? "Unknown",
      busReg:        l.busDetailId?.registrationNumber ?? "",
      driverId:      String(l.driverId?._id ?? l.driverId),
      driverName:    l.driverId?.name ?? "Unknown",
      date:          l.date,
      liters:        l.liters,
      pricePerLiter: l.pricePerLiter,
      totalCost:     l.totalCost,
      odometer:      l.odometer ?? null,
      station:       l.station ?? null,
      notes:         l.notes ?? null,
      createdAt:     l.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      thisMonthCost:   Math.round(summary.totalCost * 100) / 100,
      thisMonthLiters: Math.round(summary.totalLiters * 100) / 100,
      thisMonthCount:  summary.count,
    },
    monthly,
    buses:   buses.map((b: any) => ({ id: String(b._id), name: b.name, reg: b.registrationNumber })),
    drivers: drivers.map((d: any) => ({ id: String(d._id), name: d.name })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { busDetailId, driverId, date, liters, pricePerLiter, odometer, station, notes } = body;

  if (!busDetailId || !driverId || !date || !liters || !pricePerLiter) {
    return Response.json({ message: "Vehicle, driver, date, liters, and price are required." }, { status: 400 });
  }

  const litN  = Number(liters);
  const priceN = Number(pricePerLiter);
  if (isNaN(litN) || litN <= 0 || isNaN(priceN) || priceN <= 0) {
    return Response.json({ message: "Liters and price must be positive numbers." }, { status: 400 });
  }

  await connectToDatabase();

  const log = await FuelLogModel.create({
    busDetailId,
    driverId,
    date:          new Date(date),
    liters:        litN,
    pricePerLiter: priceN,
    totalCost:     Math.round(litN * priceN * 100) / 100,
    odometer:      odometer ? Number(odometer) : undefined,
    station:       station?.trim() || undefined,
    notes:         notes?.trim() || undefined,
  });

  const populated = await FuelLogModel.findById(log._id)
    .populate("busDetailId", "name registrationNumber")
    .populate("driverId", "name")
    .lean() as any;

  return Response.json({
    log: {
      id:            String(populated._id),
      busDetailId:   String(populated.busDetailId?._id),
      busName:       populated.busDetailId?.name ?? "",
      busReg:        populated.busDetailId?.registrationNumber ?? "",
      driverId:      String(populated.driverId?._id),
      driverName:    populated.driverId?.name ?? "",
      date:          populated.date,
      liters:        populated.liters,
      pricePerLiter: populated.pricePerLiter,
      totalCost:     populated.totalCost,
      odometer:      populated.odometer ?? null,
      station:       populated.station ?? null,
      notes:         populated.notes ?? null,
      createdAt:     populated.createdAt,
    },
  }, { status: 201 });
}
