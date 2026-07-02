import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import BookingModel, { type CheckInStatus } from "@/models/booking/Booking";

export const runtime = "nodejs";

const VALID_STATUSES: CheckInStatus[] = ["pending", "checked-in", "boarded", "no-show"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid booking ID." }, { status: 400 });
  }

  const body = await request.json();
  const status: CheckInStatus = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      { message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const update: Record<string, any> = {
    checkInStatus: status,
    checkedInBy: session.user.name ?? session.user.email ?? "Admin",
  };

  if (status === "checked-in" || status === "boarded") {
    update.checkedInAt = new Date();
  } else if (status === "pending") {
    update.checkedInAt = null;
    update.checkedInBy = null;
  }

  const booking = await BookingModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  ).lean() as any;

  if (!booking) {
    return Response.json({ message: "Booking not found." }, { status: 404 });
  }

  return Response.json({
    id: String(booking._id),
    checkInStatus: booking.checkInStatus,
    checkedInAt: booking.checkedInAt,
    checkedInBy: booking.checkedInBy,
  });
}
