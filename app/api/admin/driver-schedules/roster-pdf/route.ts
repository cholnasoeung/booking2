import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import DriverScheduleModel from "@/models/hr/DriverSchedule";
import { generateDriverRosterPDF } from "@/lib/services/pdf-generator";

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
  const weekParam = searchParams.get("week") ?? "";

  await connectToDatabase();

  const weekStart = weekParam ? (() => {
    const d = new Date(weekParam); d.setHours(0, 0, 0, 0); return d;
  })() : getMonday(new Date());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const schedules = await DriverScheduleModel.find({ date: { $gte: weekStart, $lt: weekEnd } })
    .populate("driverId", "name phone")
    .populate("busDetailId", "name registrationNumber")
    .sort({ date: 1, shiftStart: 1 })
    .lean();

  const entries = (schedules as any[]).map((s) => ({
    driverName:  s.driverId?.name  ?? "Unknown",
    driverPhone: s.driverId?.phone ?? "",
    busName:     s.busDetailId?.name ?? "Unknown",
    busReg:      s.busDetailId?.registrationNumber ?? "",
    date:        new Date(s.date).toISOString().slice(0, 10),
    shiftStart:  s.shiftStart,
    shiftEnd:    s.shiftEnd,
    status:      s.status,
    notes:       s.notes ?? "",
  }));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const weekEndDisplay = new Date(weekEnd);
  weekEndDisplay.setDate(weekEndDisplay.getDate() - 1);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEndDisplay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const pdfBuffer = generateDriverRosterPDF(entries, weekDays, weekLabel);
  const pdfBytes = new Uint8Array(pdfBuffer);

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="driver-roster-${weekStart.toISOString().slice(0, 10)}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
