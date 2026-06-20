import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import EmployeeModel from "@/models/Employee";

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

  const fields = ["name","phone","email","role","department","idNumber",
    "emergencyContact","emergencyPhone","status","salaryType",
    "baseSalary","allowanceTransport","allowanceMeal","allowanceHousing","allowanceOther","notes"];

  for (const f of fields) {
    if (body[f] !== undefined) {
      if (["baseSalary","allowanceTransport","allowanceMeal","allowanceHousing","allowanceOther"].includes(f)) {
        update[f] = Number(body[f]) || 0;
      } else {
        update[f] = typeof body[f] === "string" ? body[f].trim() || undefined : body[f];
      }
    }
  }
  if (body.hireDate !== undefined) update.hireDate = new Date(body.hireDate);

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
      notes:              emp.notes ?? null,
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
