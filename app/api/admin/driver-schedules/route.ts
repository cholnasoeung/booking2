import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import DriverScheduleModel from "@/models/DriverSchedule";
import DriverModel from "@/models/Driver";
import BusDetailModel from "@/models/BusDetail";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

function getMonday(d: Date) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const weekParam  = searchParams.get("week") ?? "";
  const driverFilter = searchParams.get("driverId") ?? "";
  const statusFilter = searchParams.get("status")   ?? "";

  await connectToDatabase();

  const weekStart = weekParam ? (() => {
    const d = new Date(weekParam); d.setHours(0,0,0,0); return d;
  })() : getMonday(new Date());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const now   = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tmrw  = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const weekFilter: Record<string, unknown> = { date: { $gte: weekStart, $lt: weekEnd } };
  if (driverFilter) weekFilter.driverId = driverFilter;
  if (statusFilter) weekFilter.status   = statusFilter;

  const [schedules, todaySchedules, drivers, buses, trips, summaryRaw] = await Promise.all([
    DriverScheduleModel.find(weekFilter)
      .populate("driverId",    "name phone")
      .populate("busDetailId", "name registrationNumber")
      .populate("busId",       "departureTime")
      .sort({ date: 1, shiftStart: 1 })
      .lean(),

    DriverScheduleModel.find({ date: { $gte: today, $lt: tmrw } })
      .populate("driverId",    "name phone")
      .populate("busDetailId", "name registrationNumber")
      .sort({ shiftStart: 1 })
      .lean(),

    DriverModel.find({ status: "active" }).select("name phone").sort({ name: 1 }).lean(),
    BusDetailModel.find().select("name registrationNumber").sort({ name: 1 }).lean(),

    BusModel.find({ date: { $gte: today } })
      .populate("routeId", "from to")
      .select("departureTime date routeId")
      .sort({ date: 1, departureTime: 1 })
      .limit(100)
      .lean(),

    DriverScheduleModel.aggregate([
      { $facet: {
        thisWeek:  [{ $match: { date: { $gte: weekStart, $lt: weekEnd } } },
                    { $count: "n" }],
        today:     [{ $match: { date: { $gte: today, $lt: tmrw } } },
                    { $count: "n" }],
        noShows:   [{ $match: { date: { $gte: monthStart, $lt: monthEnd }, status: "no_show" } },
                    { $count: "n" }],
        active:    [{ $match: { status: "active" } },
                    { $count: "n" }],
      }},
    ]),
  ]);

  const s = summaryRaw[0] ?? {};
  const summary = {
    today:    s.today?.[0]?.n   ?? 0,
    thisWeek: s.thisWeek?.[0]?.n ?? 0,
    noShows:  s.noShows?.[0]?.n  ?? 0,
    active:   s.active?.[0]?.n   ?? 0,
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const serialize = (list: any[]) => list.map((s) => ({
    id:           String(s._id),
    driverId:     String(s.driverId?._id ?? s.driverId),
    driverName:   s.driverId?.name  ?? "Unknown",
    driverPhone:  s.driverId?.phone ?? "",
    busDetailId:  String(s.busDetailId?._id ?? s.busDetailId),
    busName:      s.busDetailId?.name ?? "Unknown",
    busReg:       s.busDetailId?.registrationNumber ?? "",
    busId:        s.busId ? String(s.busId?._id ?? s.busId) : null,
    date:         s.date,
    shiftStart:   s.shiftStart,
    shiftEnd:     s.shiftEnd,
    status:       s.status,
    notes:        s.notes ?? null,
    createdAt:    s.createdAt,
  }));

  return Response.json({
    schedules:  serialize(schedules as any[]),
    today:      serialize(todaySchedules as any[]),
    weekDays,
    weekStart:  weekStart.toISOString().slice(0, 10),
    summary,
    drivers:    (drivers  as any[]).map((d) => ({ id: String(d._id), name: d.name,  phone: d.phone })),
    buses:      (buses    as any[]).map((b) => ({ id: String(b._id), name: b.name,  reg:   b.registrationNumber })),
    trips:      (trips    as any[]).map((t) => ({
      id:    String(t._id),
      label: `${(t.routeId as any)?.from ?? "?"} → ${(t.routeId as any)?.to ?? "?"} · ${t.departureTime} · ${new Date(t.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { driverId, busDetailId, busId, date, shiftStart, shiftEnd, notes } = body;

  if (!driverId || !busDetailId || !date || !shiftStart || !shiftEnd) {
    return Response.json({ message: "Driver, vehicle, date, and shift times are required." }, { status: 400 });
  }

  await connectToDatabase();

  const conflict = await DriverScheduleModel.findOne({
    driverId,
    date: new Date(date),
    status: { $nin: ["cancelled"] },
  });
  if (conflict) {
    return Response.json({ message: "This driver already has a schedule on this date." }, { status: 409 });
  }

  const schedule = await DriverScheduleModel.create({
    driverId,
    busDetailId,
    busId:      busId || undefined,
    date:       new Date(date),
    shiftStart,
    shiftEnd,
    status:     "scheduled",
    notes:      notes?.trim() || undefined,
  });

  const populated = await DriverScheduleModel.findById(schedule._id)
    .populate("driverId",    "name phone")
    .populate("busDetailId", "name registrationNumber")
    .lean() as any;

  return Response.json({
    schedule: {
      id:          String(populated._id),
      driverId:    String(populated.driverId?._id),
      driverName:  populated.driverId?.name  ?? "",
      driverPhone: populated.driverId?.phone ?? "",
      busDetailId: String(populated.busDetailId?._id),
      busName:     populated.busDetailId?.name ?? "",
      busReg:      populated.busDetailId?.registrationNumber ?? "",
      date:        populated.date,
      shiftStart:  populated.shiftStart,
      shiftEnd:    populated.shiftEnd,
      status:      populated.status,
      notes:       populated.notes ?? null,
    },
  }, { status: 201 });
}
