import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import AttendanceModel from "@/models/hr/Attendance";
import DriverModel from "@/models/hr/Driver";
import EmployeeModel from "@/models/hr/Employee";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = 30;
  const date      = searchParams.get("date") ?? "";        // "2026-07-10"
  const month     = searchParams.get("month") ?? "";       // "2026-07"
  const staffType = searchParams.get("staffType") ?? "";   // "driver" | "employee"
  const status    = searchParams.get("status") ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }
  if (staffType) filter.staffType = staffType;
  if (status)    filter.status    = status;

  // Today summary
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [total, records, drivers, employees, todayAgg] = await Promise.all([
    AttendanceModel.countDocuments(filter),

    AttendanceModel.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    DriverModel.find({ status: "active" }).select("name phone").sort({ name: 1 }).lean(),
    EmployeeModel.find({ status: "active" }).select("name department").sort({ name: 1 }).lean(),

    AttendanceModel.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  // Build id→name maps
  const driverMap = Object.fromEntries(drivers.map((d: any) => [String(d._id), { name: d.name, sub: d.phone ?? "" }]));
  const employeeMap = Object.fromEntries(employees.map((e: any) => [String(e._id), { name: e.name, sub: e.department ?? "" }]));

  const todaySummary = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 } as Record<string, number>;
  for (const row of todayAgg as any[]) todaySummary[row._id] = row.count;

  return Response.json({
    records: (records as any[]).map((r) => {
      const map = r.staffType === "driver" ? driverMap : employeeMap;
      const info = map[String(r.staffId)] ?? { name: "Unknown", sub: "" };
      return {
        id:        String(r._id),
        staffId:   String(r.staffId),
        staffType: r.staffType,
        staffName: info.name,
        staffSub:  info.sub,
        date:      r.date,
        status:    r.status,
        checkIn:   r.checkIn ?? null,
        checkOut:  r.checkOut ?? null,
        notes:     r.notes ?? null,
        createdAt: r.createdAt,
      };
    }),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    todaySummary,
    drivers:   drivers.map((d: any) => ({ id: String(d._id), name: d.name })),
    employees: employees.map((e: any) => ({ id: String(e._id), name: e.name, department: e.department ?? "" })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { staffId, staffType, date, status, checkIn, checkOut, notes } = body;

  if (!staffId || !staffType || !date || !status) {
    return Response.json({ message: "staffId, staffType, date, and status are required." }, { status: 400 });
  }
  if (!["driver", "employee"].includes(staffType)) {
    return Response.json({ message: "staffType must be driver or employee." }, { status: 400 });
  }

  await connectToDatabase();

  const d = new Date(date); d.setHours(0, 0, 0, 0);

  try {
    const record = await AttendanceModel.findOneAndUpdate(
      { staffId, date: d },
      { staffType, status, checkIn: checkIn?.trim() || undefined, checkOut: checkOut?.trim() || undefined, notes: notes?.trim() || undefined, recordedBy: session.user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean() as any;

    return Response.json({ record: { id: String(record._id), ...record } }, { status: 201 });
  } catch (err: any) {
    return Response.json({ message: err.message ?? "Failed to save attendance." }, { status: 500 });
  }
}
