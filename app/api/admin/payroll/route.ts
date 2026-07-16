import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import PayrollModel from "@/models/hr/Payroll";
import EmployeeModel from "@/models/hr/Employee";
import { calcLeaveDeduction } from "@/lib/services/leave-deduction";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  await connectToDatabase();

  const [records, summaryRaw, monthlyRaw] = await Promise.all([
    PayrollModel.find({ month })
      .populate("employeeId", "name role department status")
      .sort({ createdAt: 1 })
      .lean(),

    PayrollModel.aggregate([
      { $match: { month } },
      { $group: {
        _id: null,
        totalGross:   { $sum: "$grossPay" },
        totalNet:     { $sum: "$netPay" },
        totalBonus:   { $sum: "$bonus" },
        countDraft:   { $sum: { $cond: [{ $eq: ["$status","draft"]    }, 1, 0] } },
        countApproved:{ $sum: { $cond: [{ $eq: ["$status","approved"] }, 1, 0] } },
        countPaid:    { $sum: { $cond: [{ $eq: ["$status","paid"]     }, 1, 0] } },
      }},
    ]),

    // last 6 months total payroll for chart
    PayrollModel.aggregate([
      { $group: {
        _id:      "$month",
        totalNet: { $sum: "$netPay" },
        count:    { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  const sum = summaryRaw[0] ?? { totalGross: 0, totalNet: 0, totalBonus: 0, countDraft: 0, countApproved: 0, countPaid: 0 };

  return Response.json({
    records: (records as any[]).map((r) => ({
      id:                 String(r._id),
      employeeId:         String(r.employeeId?._id ?? r.employeeId),
      employeeName:       r.employeeId?.name       ?? "Unknown",
      employeeRole:       r.employeeId?.role       ?? "",
      employeeDept:       r.employeeId?.department ?? "",
      month:              r.month,
      baseSalary:         r.baseSalary,
      allowanceTransport: r.allowanceTransport,
      allowanceMeal:      r.allowanceMeal,
      allowanceHousing:   r.allowanceHousing,
      allowanceOther:     r.allowanceOther,
      totalAllowances:    r.totalAllowances,
      deductionTax:       r.deductionTax,
      deductionInsurance: r.deductionInsurance,
      deductionAdvance:   r.deductionAdvance,
      deductionLeave:     r.deductionLeave,
      deductionOther:     r.deductionOther,
      totalDeductions:    r.totalDeductions,
      bonus:              r.bonus,
      grossPay:           r.grossPay,
      netPay:             r.netPay,
      status:             r.status,
      paidAt:             r.paidAt ?? null,
      notes:              r.notes  ?? null,
    })),
    summary: {
      totalGross:    Math.round(sum.totalGross    * 100) / 100,
      totalNet:      Math.round(sum.totalNet      * 100) / 100,
      totalBonus:    Math.round(sum.totalBonus    * 100) / 100,
      countDraft:    sum.countDraft,
      countApproved: sum.countApproved,
      countPaid:     sum.countPaid,
      total:         sum.countDraft + sum.countApproved + sum.countPaid,
    },
    monthly: monthlyRaw.map((m: any) => ({
      month:    m._id,
      label:    (() => { const [y,mo] = m._id.split("-"); return new Date(+y,+mo-1).toLocaleString("en-US",{month:"short",year:"2-digit"}); })(),
      totalNet: Math.round(m.totalNet * 100) / 100,
      count:    m.count,
    })),
    month,
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") return Response.json({ message: "Forbidden" }, { status: 403 });

  const body  = await request.json().catch(() => ({}));
  const month = body.month as string; // "2026-06"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ message: "Valid month (YYYY-MM) is required." }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  await connectToDatabase();

  const employees = await EmployeeModel.find({ status: "active" }).lean() as any[];
  if (employees.length === 0) {
    return Response.json({ message: "No active employees found." }, { status: 400 });
  }

  let created = 0, skipped = 0;
  for (const emp of employees) {
    const existing = await PayrollModel.findOne({ employeeId: emp._id, month });
    if (existing) { skipped++; continue; }

    const totalAllowances = emp.allowanceTransport + emp.allowanceMeal + emp.allowanceHousing + emp.allowanceOther;
    const grossPay        = emp.baseSalary + totalAllowances;

    // Auto-deduct approved unpaid leave taken this month, at baseSalary / 26 per day.
    const { amount: deductionLeave } = await calcLeaveDeduction(String(emp._id), "employee", month, emp.baseSalary);
    const totalDeductions = deductionLeave;
    const netPay = grossPay - totalDeductions;

    await PayrollModel.create({
      employeeId:         emp._id,
      month,
      year:               y,
      monthNum:           m,
      baseSalary:         emp.baseSalary,
      allowanceTransport: emp.allowanceTransport,
      allowanceMeal:      emp.allowanceMeal,
      allowanceHousing:   emp.allowanceHousing,
      allowanceOther:     emp.allowanceOther,
      totalAllowances,
      deductionTax:       0,
      deductionInsurance: 0,
      deductionAdvance:   0,
      deductionLeave,
      deductionOther:     0,
      totalDeductions,
      bonus:              0,
      grossPay,
      netPay,
      status:             "draft",
    });
    created++;
  }

  return Response.json({ message: `Payroll generated: ${created} created, ${skipped} already existed.`, created, skipped });
}
