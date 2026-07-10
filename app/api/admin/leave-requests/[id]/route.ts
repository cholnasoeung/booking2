import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import LeaveRequestModel from "@/models/hr/LeaveRequest";

export const runtime = "nodejs";

// Approve / Reject / Cancel with optional admin note
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { status, adminNote } = body;

  if (!["approved", "rejected", "cancelled", "pending"].includes(status)) {
    return Response.json({ message: "Invalid status." }, { status: 400 });
  }

  await connectToDatabase();
  const updated = await LeaveRequestModel.findByIdAndUpdate(
    params.id,
    {
      status,
      adminNote: adminNote?.trim() || undefined,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
    { new: true }
  ).lean() as any;

  if (!updated) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json({ request: { id: String(updated._id), ...updated } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  await LeaveRequestModel.findByIdAndDelete(params.id);
  return Response.json({ message: "Deleted." });
}
