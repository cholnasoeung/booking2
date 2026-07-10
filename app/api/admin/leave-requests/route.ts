import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import LeaveRequestModel from "@/models/hr/LeaveRequest";
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
  const limit     = 20;
  const status    = searchParams.get("status") ?? "";
  const staffType = searchParams.get("staffType") ?? "";
  const month     = searchParams.get("month") ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (status)    filter.status    = status;
  if (staffType) filter.staffType = staffType;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.startDate = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
  }

  const [total, requests, drivers, employees, summaryRaw] = await Promise.all([
    LeaveRequestModel.countDocuments(filter),

    LeaveRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    DriverModel.find({ status: "active" }).select("name phone").sort({ name: 1 }).lean(),
    EmployeeModel.find({ status: "active" }).select("name department").sort({ name: 1 }).lean(),

    LeaveRequestModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const driverMap   = Object.fromEntries(drivers.map((d: any) => [String(d._id), { name: d.name, sub: d.phone ?? "" }]));
  const employeeMap = Object.fromEntries(employees.map((e: any) => [String(e._id), { name: e.name, sub: e.department ?? "" }]));

  const summary = { pending: 0, approved: 0, rejected: 0, cancelled: 0 } as Record<string, number>;
  for (const row of summaryRaw as any[]) summary[row._id] = row.count;

  return Response.json({
    requests: (requests as any[]).map((r) => {
      const map  = r.staffType === "driver" ? driverMap : employeeMap;
      const info = map[String(r.staffId)] ?? { name: "Unknown", sub: "" };
      return {
        id:         String(r._id),
        staffId:    String(r.staffId),
        staffType:  r.staffType,
        staffName:  info.name,
        staffSub:   info.sub,
        leaveType:  r.leaveType,
        startDate:  r.startDate,
        endDate:    r.endDate,
        days:       r.days,
        reason:     r.reason,
        status:     r.status,
        adminNote:  r.adminNote ?? null,
        reviewedAt: r.reviewedAt ?? null,
        createdAt:  r.createdAt,
      };
    }),
    total, page,
    totalPages: Math.ceil(total / limit),
    summary,
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
  const { staffId, staffType, leaveType, startDate, endDate, reason } = body;

  if (!staffId || !staffType || !leaveType || !startDate || !endDate || !reason) {
    return Response.json({ message: "All fields are required." }, { status: 400 });
  }

  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(0, 0, 0, 0);
  if (end < start) return Response.json({ message: "End date must be after start date." }, { status: 400 });

  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  await connectToDatabase();
  const req = await LeaveRequestModel.create({ staffId, staffType, leaveType, startDate: start, endDate: end, days, reason: reason.trim() });

  return Response.json({ request: { id: String(req._id), ...req.toObject() } }, { status: 201 });
}
