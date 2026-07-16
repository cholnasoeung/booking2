import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import EmployeeModel from "@/models/hr/Employee";
import { calcLeaveDeduction } from "@/lib/services/leave-deduction";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? "";
  const month = searchParams.get("month") ?? "";

  if (!employeeId || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ message: "employeeId and month (YYYY-MM) are required." }, { status: 400 });
  }

  await connectToDatabase();

  const employee = await EmployeeModel.findById(employeeId).select("baseSalary").lean() as any;
  if (!employee) {
    return Response.json({ message: "Employee not found." }, { status: 404 });
  }

  const { days, amount } = await calcLeaveDeduction(employeeId, "employee", month, employee.baseSalary);

  return Response.json({ days, amount });
}
