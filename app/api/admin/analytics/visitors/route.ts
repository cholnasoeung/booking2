import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import PageViewModel from "@/models/system/PageView";

export const runtime = "nodejs";

function getRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }
  return { start, end };
}

async function aggregate(field: string, match: object) {
  return PageViewModel.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const { start, end } = getRange(period);
  const match = { createdAt: { $gte: start, $lte: end } };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMatch = { createdAt: { $gte: todayStart, $lte: end } };

  await connectToDatabase();

  const [
    totalViews,
    uniqueSessions,
    todayViews,
    devices,
    browsers,
    osData,
    topPages,
    referrers,
    hourlyRaw,
  ] = await Promise.all([
    PageViewModel.countDocuments(match),
    PageViewModel.distinct("sessionId", match).then((r) => r.length),
    PageViewModel.countDocuments(todayMatch),
    aggregate("device", match),
    aggregate("browser", match),
    aggregate("os", match),
    aggregate("page", match),
    aggregate("referrer", match),
    // Hourly breakdown for today
    PageViewModel.aggregate([
      { $match: todayMatch },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Fill all 24 hours for the hourly chart
  const hourlyMap: Record<number, number> = {};
  hourlyRaw.forEach((h: any) => { hourlyMap[h._id] = h.count; });
  const hourly = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    count: hourlyMap[i] ?? 0,
  }));

  return Response.json({
    period,
    summary: { totalViews, uniqueSessions, todayViews },
    devices:   devices.map((d: any) => ({ name: d._id, count: d.count })),
    browsers:  browsers.map((d: any) => ({ name: d._id, count: d.count })),
    os:        osData.map((d: any) => ({ name: d._id, count: d.count })),
    topPages:  topPages.map((d: any) => ({ page: d._id, count: d.count })),
    referrers: referrers.map((d: any) => ({ source: d._id, count: d.count })),
    hourly,
  });
}
