import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import DriverEarningModel from "@/models/hr/DriverEarning";
import DriverModel from "@/models/hr/Driver";
import BusDetailModel from "@/models/transport/BusDetail";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = 20;
  const driverId = searchParams.get("driverId") ?? "";
  const month    = searchParams.get("month") ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (driverId) filter.driverId = driverId;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [total, entries, drivers, buses, summaryRaw, monthlyRaw, driverBreakdownRaw] = await Promise.all([
    DriverEarningModel.countDocuments(filter),

    DriverEarningModel.find(filter)
      .populate("driverId",    "name")
      .populate("busDetailId", "name registrationNumber")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    DriverModel.find().select("name").sort({ name: 1 }).lean(),
    BusDetailModel.find().select("name registrationNumber").sort({ name: 1 }).lean(),

    // This-month summary
    DriverEarningModel.aggregate([
      { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: {
        _id: null,
        totalPayroll:    { $sum: "$totalEarnings" },
        totalOvertime:   { $sum: "$overtimeEarnings" },
        totalRegular:    { $sum: "$regularEarnings" },
        totalOTTrips:    { $sum: "$overtimeTrips" },
        count:           { $sum: 1 },
      }},
    ]),

    // Monthly chart — last 6 months
    DriverEarningModel.aggregate([
      { $match: { date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        totalPayroll:  { $sum: "$totalEarnings" },
        totalOvertime: { $sum: "$overtimeEarnings" },
        totalRegular:  { $sum: "$regularEarnings" },
        count:         { $sum: 1 },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // This month: per-driver breakdown
    DriverEarningModel.aggregate([
      { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: {
        _id:           "$driverId",
        totalEarnings: { $sum: "$totalEarnings" },
        totalOT:       { $sum: "$overtimeEarnings" },
        trips:         { $sum: { $add: ["$regularTrips", "$overtimeTrips"] } },
      }},
      { $sort: { totalEarnings: -1 } },
      { $limit: 5 },
      { $lookup: { from: "drivers", localField: "_id", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const summary = summaryRaw[0] ?? { totalPayroll: 0, totalOvertime: 0, totalRegular: 0, totalOTTrips: 0, count: 0 };

  const monthly = monthlyRaw.map((m: any) => ({
    label:        new Date(m._id.year, m._id.month - 1).toLocaleString("en-US", { month: "short", year: "2-digit" }),
    totalPayroll: Math.round(m.totalPayroll  * 100) / 100,
    regular:      Math.round(m.totalRegular  * 100) / 100,
    overtime:     Math.round(m.totalOvertime * 100) / 100,
    count:        m.count,
  }));

  const topDrivers = driverBreakdownRaw.map((d: any) => ({
    name:          d.driver?.name ?? "Unknown",
    totalEarnings: Math.round(d.totalEarnings * 100) / 100,
    overtime:      Math.round(d.totalOT        * 100) / 100,
    trips:         d.trips,
  }));

  return Response.json({
    entries: (entries as any[]).map((e) => ({
      id:               String(e._id),
      driverId:         String(e.driverId?._id ?? e.driverId),
      driverName:       e.driverId?.name ?? "Unknown",
      busDetailId:      e.busDetailId ? String(e.busDetailId?._id ?? e.busDetailId) : null,
      busName:          e.busDetailId?.name ?? null,
      busReg:           e.busDetailId?.registrationNumber ?? null,
      date:             e.date,
      regularTrips:     e.regularTrips,
      overtimeTrips:    e.overtimeTrips,
      basePay:          e.basePay,
      overtimeRate:     e.overtimeRate,
      regularEarnings:  e.regularEarnings,
      overtimeEarnings: e.overtimeEarnings,
      totalEarnings:    e.totalEarnings,
      notes:            e.notes ?? null,
      createdAt:        e.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      thisMonthPayroll:  Math.round(summary.totalPayroll  * 100) / 100,
      thisMonthOvertime: Math.round(summary.totalOvertime * 100) / 100,
      thisMonthRegular:  Math.round(summary.totalRegular  * 100) / 100,
      thisMonthCount:    summary.count,
    },
    monthly,
    topDrivers,
    drivers: drivers.map((d: any) => ({ id: String(d._id), name: d.name })),
    buses:   buses.map((b: any)   => ({ id: String(b._id), name: b.name, reg: b.registrationNumber })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { driverId, busDetailId, date, regularTrips, overtimeTrips, basePay, overtimeRate, notes } = body;

  if (!driverId || !date || basePay === undefined) {
    return Response.json({ message: "Driver, date, and base pay are required." }, { status: 400 });
  }

  const rt  = Math.max(0, Number(regularTrips)  || 0);
  const ot  = Math.max(0, Number(overtimeTrips) || 0);
  const bp  = Number(basePay);
  const otr = Number(overtimeRate) || 1.5;

  if (isNaN(bp) || bp <= 0) {
    return Response.json({ message: "Base pay must be a positive number." }, { status: 400 });
  }

  const regularEarnings  = Math.round(rt * bp * 100) / 100;
  const overtimeEarnings = Math.round(ot * bp * otr * 100) / 100;
  const totalEarnings    = Math.round((regularEarnings + overtimeEarnings) * 100) / 100;

  await connectToDatabase();

  const entry = await DriverEarningModel.create({
    driverId,
    busDetailId:      busDetailId || undefined,
    date:             new Date(date),
    regularTrips:     rt,
    overtimeTrips:    ot,
    basePay:          bp,
    overtimeRate:     otr,
    regularEarnings,
    overtimeEarnings,
    totalEarnings,
    notes: notes?.trim() || undefined,
  });

  const populated = await DriverEarningModel.findById(entry._id)
    .populate("driverId",    "name")
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  return Response.json({ entry: { id: String(populated._id), ...populated } }, { status: 201 });
}
