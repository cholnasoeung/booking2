import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BookingModel from "@/models/Booking";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

  const matchRange = { $match: { createdAt: { $gte: start, $lte: end } } };

  // ── 1. Daily revenue breakdown ──────────────────────────────────────
  const dailyRevenue = await BookingModel.aggregate([
    matchRange,
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
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
        totalBookings:    { $sum: 1 },
        confirmedCount:   { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        cancelledCount:   { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        pendingCount:     { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        grossRevenue:     { $sum: "$finalPrice" },
        totalRefunds:     { $sum: { $ifNull: ["$refundAmount", 0] } },
        totalDiscounts:   { $sum: { $ifNull: ["$discountAmount", 0] } },
        totalPassengers:  { $sum: { $size: "$seats" } },
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
    {
      $lookup: {
        from: "buses",
        localField: "bus",
        foreignField: "_id",
        as: "busInfo",
      },
    },
    { $unwind: { path: "$busInfo", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: "routes",
        localField: "busInfo.routeId",
        foreignField: "_id",
        as: "routeInfo",
      },
    },
    { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$busInfo.routeId",
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

  // ── 4. Top routes by booking count ───────────────────────────────────
  const busiest = [...routePerformance]
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 10)
    .map((r) => ({
      route:             `${r.from} → ${r.to}`,
      confirmed:         r.confirmedBookings,
      cancelled:         r.cancelledBookings,
      total:             r.totalBookings,
      revenue:           r.revenue,
    }));

  // Build response
  const net = stats.grossRevenue - stats.totalRefunds;

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
        ? Math.round((stats.confirmedCount / stats.totalBookings) * 1000) / 10
        : 0,
      cancellationRate: stats.totalBookings > 0
        ? Math.round((stats.cancelledCount / stats.totalBookings) * 1000) / 10
        : 0,
      avgTicketValue:   stats.confirmedCount > 0
        ? Math.round((stats.grossRevenue / stats.confirmedCount) * 100) / 100
        : 0,
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
      occupancyNote:     `${r.confirmedBookings} confirmed bookings · ${r.totalSeats} seats sold`,
    })),
  });
}
