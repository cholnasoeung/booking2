import LeaveRequestModel from "@/models/hr/LeaveRequest";

// Daily rate basis for converting unpaid leave days into a payroll deduction.
// 26 working days/month is a common Cambodian payroll convention; adjust here
// if the business uses a different divisor (e.g. actual calendar days).
export const PAYROLL_WORKING_DAYS_PER_MONTH = 26;

export function calcDailyRate(baseSalary: number): number {
  return baseSalary / PAYROLL_WORKING_DAYS_PER_MONTH;
}

/**
 * Sums approved, unpaid-type leave days for a staff member whose leave
 * request started within the given payroll month ("YYYY-MM").
 */
export async function getUnpaidLeaveDaysForMonth(
  staffId: string,
  staffType: "employee" | "driver",
  month: string
): Promise<number> {
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const requests = await LeaveRequestModel.find({
    staffId,
    staffType,
    leaveType: "unpaid",
    status: "approved",
    startDate: { $gte: monthStart, $lt: monthEnd },
  }).select("days").lean();

  return (requests as any[]).reduce((sum, r) => sum + (r.days ?? 0), 0);
}

export async function calcLeaveDeduction(
  staffId: string,
  staffType: "employee" | "driver",
  month: string,
  baseSalary: number
): Promise<{ days: number; amount: number }> {
  const days = await getUnpaidLeaveDaysForMonth(staffId, staffType, month);
  const amount = Math.round(calcDailyRate(baseSalary) * days * 100) / 100;
  return { days, amount };
}
