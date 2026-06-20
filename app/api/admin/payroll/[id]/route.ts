import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import PayrollModel from "@/models/Payroll";

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

  const body    = await request.json().catch(() => ({}));
  const existing = await PayrollModel.findById(id).lean() as any;
  if (!existing) return Response.json({ message: "Payroll record not found" }, { status: 404 });

  const deductionTax       = body.deductionTax       !== undefined ? Number(body.deductionTax)       : existing.deductionTax;
  const deductionInsurance = body.deductionInsurance !== undefined ? Number(body.deductionInsurance) : existing.deductionInsurance;
  const deductionAdvance   = body.deductionAdvance   !== undefined ? Number(body.deductionAdvance)   : existing.deductionAdvance;
  const deductionOther     = body.deductionOther     !== undefined ? Number(body.deductionOther)     : existing.deductionOther;
  const bonus              = body.bonus              !== undefined ? Number(body.bonus)              : existing.bonus;

  const totalDeductions = deductionTax + deductionInsurance + deductionAdvance + deductionOther;
  const grossPay        = existing.baseSalary + existing.totalAllowances + bonus;
  const netPay          = grossPay - totalDeductions;

  const update: Record<string, unknown> = {
    deductionTax, deductionInsurance, deductionAdvance, deductionOther,
    totalDeductions, bonus, grossPay, netPay,
  };

  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "paid") update.paidAt = new Date();
  }
  if (body.notes !== undefined) update.notes = body.notes?.trim() || undefined;

  const record = await PayrollModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("employeeId", "name role department")
    .lean() as any;

  return Response.json({
    record: {
      id:                 String(record._id),
      employeeId:         String(record.employeeId?._id),
      employeeName:       record.employeeId?.name       ?? "",
      employeeRole:       record.employeeId?.role       ?? "",
      employeeDept:       record.employeeId?.department ?? "",
      baseSalary:         record.baseSalary,
      totalAllowances:    record.totalAllowances,
      deductionTax:       record.deductionTax,
      deductionInsurance: record.deductionInsurance,
      deductionAdvance:   record.deductionAdvance,
      deductionOther:     record.deductionOther,
      totalDeductions:    record.totalDeductions,
      bonus:              record.bonus,
      grossPay:           record.grossPay,
      netPay:             record.netPay,
      status:             record.status,
      paidAt:             record.paidAt ?? null,
      notes:              record.notes  ?? null,
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
  const r = await PayrollModel.findByIdAndDelete(id);
  if (!r) return Response.json({ message: "Record not found" }, { status: 404 });

  return Response.json({ message: "Payroll record deleted" });
}
