import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import AttendanceModel from "@/models/hr/Attendance";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status, checkIn, checkOut, notes } = body;

  await connectToDatabase();
  const updated = await AttendanceModel.findByIdAndUpdate(
    id,
    { ...(status && { status }), checkIn: checkIn?.trim() || undefined, checkOut: checkOut?.trim() || undefined, notes: notes?.trim() || undefined },
    { new: true }
  ).lean() as any;

  if (!updated) return Response.json({ message: "Record not found." }, { status: 404 });
  return Response.json({ record: { id: String(updated._id), ...updated } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await connectToDatabase();
  await AttendanceModel.findByIdAndDelete(id);
  return Response.json({ message: "Deleted." });
}
