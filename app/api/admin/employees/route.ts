import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import EmployeeModel from "@/models/Employee";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role   = searchParams.get("role")   ?? "";
  const dept   = searchParams.get("dept")   ?? "";
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("q")      ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (role)   filter.role       = role;
  if (dept)   filter.department = dept;
  if (status) filter.status     = status;
  if (search) filter.name       = { $regex: search, $options: "i" };

  const [employees, statsRaw] = await Promise.all([
    EmployeeModel.find(filter).sort({ name: 1 }).lean(),
    EmployeeModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const stats: Record<string, number> = { active: 0, on_leave: 0, resigned: 0, terminated: 0 };
  for (const s of statsRaw as any[]) stats[s._id] = s.count;

  return Response.json({
    employees: (employees as any[]).map((e) => ({
      id:                 String(e._id),
      name:               e.name,
      phone:              e.phone,
      email:              e.email ?? null,
      role:               e.role,
      department:         e.department,
      hireDate:           e.hireDate,
      idNumber:           e.idNumber ?? null,
      emergencyContact:   e.emergencyContact ?? null,
      emergencyPhone:     e.emergencyPhone   ?? null,
      status:             e.status,
      salaryType:         e.salaryType,
      baseSalary:         e.baseSalary,
      allowanceTransport: e.allowanceTransport,
      allowanceMeal:      e.allowanceMeal,
      allowanceHousing:   e.allowanceHousing,
      allowanceOther:     e.allowanceOther,
      totalAllowances:    e.allowanceTransport + e.allowanceMeal + e.allowanceHousing + e.allowanceOther,
      grossMonthly:       e.baseSalary + e.allowanceTransport + e.allowanceMeal + e.allowanceHousing + e.allowanceOther,
      notes:              e.notes          ?? null,
      leaveType:          e.leaveType      ?? null,
      leaveStartDate:     e.leaveStartDate ?? null,
      leaveReturnDate:    e.leaveReturnDate ?? null,
      leaveNote:          e.leaveNote      ?? null,
      resignDate:         e.resignDate     ?? null,
      lastWorkingDay:     e.lastWorkingDay ?? null,
      resignReason:       e.resignReason   ?? null,
      resignNote:         e.resignNote     ?? null,
      terminationDate:    e.terminationDate    ?? null,
      terminationReason:  e.terminationReason  ?? null,
      terminationNote:    e.terminationNote    ?? null,
      createdAt:          e.createdAt,
      avatar:             e.avatar ?? null,
    })),
    stats,
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { name, phone, role, department, hireDate, baseSalary,
          email, idNumber, emergencyContact, emergencyPhone,
          salaryType, allowanceTransport, allowanceMeal, allowanceHousing, allowanceOther, notes } = body;

  if (!name?.trim() || !phone?.trim() || !role || !department || !hireDate || baseSalary === undefined) {
    return Response.json({ message: "Name, phone, role, department, hire date and base salary are required." }, { status: 400 });
  }

  await connectToDatabase();

  const emp = await EmployeeModel.create({
    name:               name.trim(),
    phone:              phone.trim(),
    email:              email?.trim()            || undefined,
    role,
    department,
    hireDate:           new Date(hireDate),
    idNumber:           idNumber?.trim()         || undefined,
    emergencyContact:   emergencyContact?.trim() || undefined,
    emergencyPhone:     emergencyPhone?.trim()   || undefined,
    status:             "active",
    salaryType:         salaryType ?? "monthly",
    baseSalary:         Number(baseSalary),
    allowanceTransport: Number(allowanceTransport) || 0,
    allowanceMeal:      Number(allowanceMeal)      || 0,
    allowanceHousing:   Number(allowanceHousing)   || 0,
    allowanceOther:     Number(allowanceOther)     || 0,
    notes:              notes?.trim()             || undefined,
  });

  return Response.json({ employee: { id: String(emp._id), ...emp.toObject() } }, { status: 201 });
}
