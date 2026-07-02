import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import EmployeeModel from "@/models/hr/Employee";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const body   = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  const strFields = ["name","phone","email","role","department","idNumber",
    "emergencyContact","emergencyPhone","status","salaryType","notes",
    "leaveType","leaveNote","resignReason","resignNote","terminationReason","terminationNote"];
  const numFields = ["baseSalary","allowanceTransport","allowanceMeal","allowanceHousing","allowanceOther"];
  const dateFields = ["hireDate","leaveStartDate","leaveReturnDate","resignDate","lastWorkingDay","terminationDate"];

  for (const f of strFields) {
    if (body[f] !== undefined)
      update[f] = typeof body[f] === "string" ? body[f].trim() || undefined : body[f];
  }
  for (const f of numFields) {
    if (body[f] !== undefined) update[f] = Number(body[f]) || 0;
  }
  for (const f of dateFields) {
    if (body[f] !== undefined) update[f] = body[f] ? new Date(body[f]) : undefined;
  }

  const emp = await EmployeeModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any;
  if (!emp) return Response.json({ message: "Employee not found" }, { status: 404 });

  return Response.json({
    employee: {
      id:                 String(emp._id),
      name:               emp.name,
      phone:              emp.phone,
      email:              emp.email ?? null,
      role:               emp.role,
      department:         emp.department,
      hireDate:           emp.hireDate,
      idNumber:           emp.idNumber ?? null,
      emergencyContact:   emp.emergencyContact ?? null,
      emergencyPhone:     emp.emergencyPhone   ?? null,
      status:             emp.status,
      salaryType:         emp.salaryType,
      baseSalary:         emp.baseSalary,
      allowanceTransport: emp.allowanceTransport,
      allowanceMeal:      emp.allowanceMeal,
      allowanceHousing:   emp.allowanceHousing,
      allowanceOther:     emp.allowanceOther,
      totalAllowances:    emp.allowanceTransport + emp.allowanceMeal + emp.allowanceHousing + emp.allowanceOther,
      grossMonthly:       emp.baseSalary + emp.allowanceTransport + emp.allowanceMeal + emp.allowanceHousing + emp.allowanceOther,
      notes:              emp.notes             ?? null,
      leaveType:          emp.leaveType         ?? null,
      leaveStartDate:     emp.leaveStartDate    ?? null,
      leaveReturnDate:    emp.leaveReturnDate   ?? null,
      leaveNote:          emp.leaveNote         ?? null,
      resignDate:         emp.resignDate        ?? null,
      lastWorkingDay:     emp.lastWorkingDay    ?? null,
      resignReason:       emp.resignReason      ?? null,
      resignNote:         emp.resignNote        ?? null,
      terminationDate:    emp.terminationDate   ?? null,
      terminationReason:  emp.terminationReason ?? null,
      terminationNote:    emp.terminationNote   ?? null,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const emp = await EmployeeModel.findByIdAndDelete(id);
  if (!emp) return Response.json({ message: "Employee not found" }, { status: 404 });

  return Response.json({ message: "Employee deleted" });
}
