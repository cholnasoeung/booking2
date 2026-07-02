import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import BookingModel from "@/models/booking/Booking";
import FuelLogModel from "@/models/operations/FuelLog";
import MaintenanceModel from "@/models/operations/Maintenance";
import DriverEarningModel from "@/models/hr/DriverEarning";
import PayrollModel from "@/models/hr/Payroll";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return Response.json({ message: "startDate and endDate are required" }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end   = new Date(`${endDate}T23:59:59.999Z`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return Response.json({ message: "Invalid date range" }, { status: 400 });
  }

  await connectToDatabase();

  const matchRange    = { $match: { createdAt: { $gte: start, $lte: end } } };
  const matchDateRange = { $match: { date: { $gte: start, $lte: end } } };

  // ── 1. Daily revenue breakdown ──────────────────────────────────────
  const dailyRevenue = await BookingModel.aggregate([
    matchRange,
    {
      $group: {
        _id:       { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        gross:     { $sum: "$finalPrice" },
        refunds:   { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, { $ifNull: ["$refundAmount", 0] }, 0] } },
        discounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        total:     { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ── 2. Overall booking stats ─────────────────────────────────────────
  const overallStats = await BookingModel.aggregate([
    matchRange,
    {
      $group: {
        _id: null,
        totalBookings:   { $sum: 1 },
        confirmedCount:  { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        cancelledCount:  { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        pendingCount:    { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        grossRevenue:    { $sum: "$finalPrice" },
        totalRefunds:    { $sum: { $ifNull: ["$refundAmount", 0] } },
        totalDiscounts:  { $sum: { $ifNull: ["$discountAmount", 0] } },
        totalPassengers: { $sum: { $size: "$seats" } },
      },
    },
  ]);

  const stats = overallStats[0] ?? {
    totalBookings: 0, confirmedCount: 0, cancelledCount: 0, pendingCount: 0,
    grossRevenue: 0, totalRefunds: 0, totalDiscounts: 0, totalPassengers: 0,
  };

  // ── 3. Route performance ─────────────────────────────────────────────
  const routePerformance = await BookingModel.aggregate([
    matchRange,
    { $lookup: { from: "buses",  localField: "bus",         foreignField: "_id", as: "busInfo"   } },
    { $unwind: { path: "$busInfo",   preserveNullAndEmptyArrays: false } },
    { $lookup: { from: "routes", localField: "busInfo.routeId", foreignField: "_id", as: "routeInfo" } },
    { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id:               "$busInfo.routeId",
        from:              { $first: "$routeInfo.from" },
        to:                { $first: "$routeInfo.to" },
        totalBookings:     { $sum: 1 },
        confirmedBookings: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        revenue:           { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, "$finalPrice", 0] } },
        totalSeats:        { $sum: { $size: "$seats" } },
        refunds:           { $sum: { $ifNull: ["$refundAmount", 0] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const busiest = [...routePerformance]
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 10)
    .map((r) => ({
      route:     `${r.from} → ${r.to}`,
      confirmed: r.confirmedBookings,
      cancelled: r.cancelledBookings,
      total:     r.totalBookings,
      revenue:   r.revenue,
    }));

  // ── 4. Fuel expenses ─────────────────────────────────────────────────
  const [fuelOverall, fuelByDay] = await Promise.all([
    FuelLogModel.aggregate([
      matchDateRange,
      { $group: { _id: null, total: { $sum: "$totalCost" }, liters: { $sum: "$liters" }, count: { $sum: 1 } } },
    ]),
    FuelLogModel.aggregate([
      matchDateRange,
      {
        $group: {
          _id:    { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          cost:   { $sum: "$totalCost" },
          liters: { $sum: "$liters" },
          count:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // ── 5. Maintenance expenses ──────────────────────────────────────────
  const [maintOverall, maintByType] = await Promise.all([
    MaintenanceModel.aggregate([
      { $match: { date: { $gte: start, $lte: end }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$cost" }, count: { $sum: 1 } } },
    ]),
    MaintenanceModel.aggregate([
      { $match: { date: { $gte: start, $lte: end }, status: "completed" } },
      {
        $group: {
          _id:   "$maintenanceType",
          total: { $sum: "$cost" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  // ── 6. Driver earnings ───────────────────────────────────────────────
  const earningsOverall = await DriverEarningModel.aggregate([
    matchDateRange,
    {
      $group: {
        _id:             null,
        total:           { $sum: "$totalEarnings" },
        regularEarnings: { $sum: "$regularEarnings" },
        otEarnings:      { $sum: "$overtimeEarnings" },
        count:           { $sum: 1 },
      },
    },
  ]);

  // ── 7. Payroll (approved + paid, months within range) ───────────────
  const startMonth = startDate.slice(0, 7); // "2026-01"
  const endMonth   = endDate.slice(0, 7);

  const payrollOverall = await PayrollModel.aggregate([
    { $match: { month: { $gte: startMonth, $lte: endMonth }, status: { $in: ["approved", "paid"] } } },
    {
      $group: {
        _id:             null,
        grossPay:        { $sum: "$grossPay" },
        netPay:          { $sum: "$netPay" },
        totalDeductions: { $sum: "$totalDeductions" },
        count:           { $sum: 1 },
      },
    },
  ]);

  // ── Build totals ─────────────────────────────────────────────────────
  const fuelTotal    = fuelOverall[0]?.total        ?? 0;
  const maintTotal   = maintOverall[0]?.total       ?? 0;
  const earningsTotal = earningsOverall[0]?.total   ?? 0;
  const payrollTotal = payrollOverall[0]?.netPay    ?? 0;
  const totalExpenses = fuelTotal + maintTotal + earningsTotal + payrollTotal;

  const net = stats.grossRevenue - stats.totalRefunds;
  const profitLoss = net - totalExpenses;

  return Response.json({
    dateRange: { start: startDate, end: endDate },
    revenue: {
      gross:     stats.grossRevenue,
      refunds:   stats.totalRefunds,
      discounts: stats.totalDiscounts,
      net,
      byDay: dailyRevenue.map((d) => ({
        date:      d._id,
        gross:     d.gross,
        refunds:   d.refunds,
        net:       d.gross - d.refunds,
        discounts: d.discounts,
        confirmed: d.confirmed,
        cancelled: d.cancelled,
        total:     d.total,
      })),
    },
    bookings: {
      total:            stats.totalBookings,
      confirmed:        stats.confirmedCount,
      cancelled:        stats.cancelledCount,
      pending:          stats.pendingCount,
      confirmedRate:    stats.totalBookings > 0
        ? Math.round((stats.confirmedCount / stats.totalBookings) * 1000) / 10 : 0,
      cancellationRate: stats.totalBookings > 0
        ? Math.round((stats.cancelledCount / stats.totalBookings) * 1000) / 10 : 0,
      avgTicketValue:   stats.confirmedCount > 0
        ? Math.round((stats.grossRevenue / stats.confirmedCount) * 100) / 100 : 0,
      totalPassengers:  stats.totalPassengers,
      byRoute:          busiest,
    },
    routes: routePerformance.map((r) => ({
      routeId:           r._id?.toString(),
      from:              r.from,
      to:                r.to,
      totalBookings:     r.totalBookings,
      confirmedBookings: r.confirmedBookings,
      cancelledBookings: r.cancelledBookings,
      revenue:           r.revenue,
      refunds:           r.refunds,
      totalSeats:        r.totalSeats,
      occupancyNote:     `${r.confirmedBookings} confirmed · ${r.totalSeats} seats`,
    })),
    expenses: {
      fuel: {
        total:  fuelTotal,
        liters: fuelOverall[0]?.liters ?? 0,
        count:  fuelOverall[0]?.count  ?? 0,
        byDay:  fuelByDay.map((d) => ({ date: d._id, cost: d.cost, liters: d.liters, count: d.count })),
      },
      maintenance: {
        total: maintTotal,
        count: maintOverall[0]?.count ?? 0,
        byType: maintByType.map((t) => ({ type: t._id as string, total: t.total, count: t.count })),
      },
      driverPay: {
        total:           earningsTotal,
        regularEarnings: earningsOverall[0]?.regularEarnings ?? 0,
        otEarnings:      earningsOverall[0]?.otEarnings      ?? 0,
        count:           earningsOverall[0]?.count           ?? 0,
      },
      payroll: {
        grossPay:        payrollOverall[0]?.grossPay        ?? 0,
        netPay:          payrollTotal,
        totalDeductions: payrollOverall[0]?.totalDeductions ?? 0,
        count:           payrollOverall[0]?.count           ?? 0,
      },
      totalExpenses,
      profitLoss,
    },
  });
  } catch (err) {
    console.error("[reports] GET error:", err);
    return Response.json(
      { message: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
