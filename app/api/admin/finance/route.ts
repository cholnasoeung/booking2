import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date) {
  const r = new Date(d);
  r.setUTCHours(23, 59, 59, 999);
  return r;
}
function parseDate(s: string | null, fallback: Date) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("groupBy") ?? "day"; // day | week | month

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 29);

  const from = startOfDay(parseDate(searchParams.get("from"), defaultFrom));
  const to   = endOfDay(parseDate(searchParams.get("to"), now));

  await connectToDatabase();

  // ── Revenue over time ─────────────────────────────────────────────
  const groupFormat =
    groupBy === "month" ? "%Y-%m"
    : groupBy === "week" ? "%Y-%U"
    : "%Y-%m-%d";

  const revenueTimeline = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        status: { $in: ["confirmed", "cancelled", "refunded"] },
        paymentStatus: { $in: ["paid", "refunded"] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        revenue:  { $sum: "$finalPrice" },
        refunds:  { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$refundAmount", 0] } },
        bookings: { $sum: 1 },
        seats:    { $sum: { $size: "$seats" } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ── Summary KPIs ─────────────────────────────────────────────────
  const [summary] = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        paymentStatus: { $in: ["paid", "refunded"] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue:   { $sum: "$finalPrice" },
        totalRefunds:   { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$refundAmount", 0] } },
        totalBookings:  { $sum: 1 },
        totalSeats:     { $sum: { $size: "$seats" } },
        avgTicketPrice: { $avg: "$finalPrice" },
        cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
      },
    },
  ]);

  // ── Route breakdown ──────────────────────────────────────────────
  const routeBreakdown = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        paymentStatus: { $in: ["paid", "refunded"] },
      },
    },
    {
      $lookup: {
        from: "buses",
        localField: "bus",
        foreignField: "_id",
        as: "busDoc",
      },
    },
    { $unwind: { path: "$busDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "routes",
        localField: "busDoc.routeId",
        foreignField: "_id",
        as: "routeDoc",
      },
    },
    { $unwind: { path: "$routeDoc", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$busDoc.routeId",
        routeFrom:  { $first: "$routeDoc.from" },
        routeTo:    { $first: "$routeDoc.to" },
        revenue:    { $sum: "$finalPrice" },
        bookings:   { $sum: 1 },
        seats:      { $sum: { $size: "$seats" } },
        avgPrice:   { $avg: "$finalPrice" },
        refunds:    { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$refundAmount", 0] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 20 },
  ]);

  // ── Payment method breakdown ─────────────────────────────────────
  const paymentBreakdown = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lte: to },
        paymentStatus: { $in: ["paid", "refunded"] },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$metadata.paymentMethod", "online"] },
        revenue:  { $sum: "$finalPrice" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // ── Previous period comparison ───────────────────────────────────
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo   = new Date(to.getTime()   - periodMs);

  const [prevSummary] = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: prevFrom, $lte: prevTo },
        paymentStatus: { $in: ["paid", "refunded"] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue:  { $sum: "$finalPrice" },
        totalBookings: { $sum: 1 },
      },
    },
  ]);

  const netRevenue = (summary?.totalRevenue ?? 0) - (summary?.totalRefunds ?? 0);
  const prevRevenue = prevSummary?.totalRevenue ?? 0;
  const revenueChange = prevRevenue > 0
    ? Math.round(((netRevenue - prevRevenue) / prevRevenue) * 1000) / 10
    : null;

  return Response.json({
    period: { from: from.toISOString(), to: to.toISOString(), groupBy },
    summary: {
      totalRevenue:   Math.round((summary?.totalRevenue   ?? 0) * 100) / 100,
      totalRefunds:   Math.round((summary?.totalRefunds   ?? 0) * 100) / 100,
      netRevenue:     Math.round(netRevenue * 100) / 100,
      totalBookings:  summary?.totalBookings  ?? 0,
      totalSeats:     summary?.totalSeats     ?? 0,
      avgTicketPrice: Math.round((summary?.avgTicketPrice ?? 0) * 100) / 100,
      cancelledCount: summary?.cancelledCount ?? 0,
      cancellationRate: summary?.totalBookings
        ? Math.round(((summary.cancelledCount ?? 0) / summary.totalBookings) * 1000) / 10
        : 0,
      revenueChange,
    },
    timeline: revenueTimeline.map((r) => ({
      label:    r._id,
      revenue:  Math.round(r.revenue  * 100) / 100,
      refunds:  Math.round(r.refunds  * 100) / 100,
      net:      Math.round((r.revenue - r.refunds) * 100) / 100,
      bookings: r.bookings,
      seats:    r.seats,
    })),
    routeBreakdown: routeBreakdown.map((r) => ({
      routeId:  r._id ? String(r._id) : null,
      from:     r.routeFrom ?? "—",
      to:       r.routeTo   ?? "—",
      revenue:  Math.round(r.revenue  * 100) / 100,
      refunds:  Math.round(r.refunds  * 100) / 100,
      net:      Math.round((r.revenue - r.refunds) * 100) / 100,
      bookings: r.bookings,
      seats:    r.seats,
      avgPrice: Math.round(r.avgPrice * 100) / 100,
    })),
    paymentBreakdown: paymentBreakdown.map((p) => ({
      method:   p._id,
      revenue:  Math.round(p.revenue  * 100) / 100,
      bookings: p.bookings,
    })),
  });
}
