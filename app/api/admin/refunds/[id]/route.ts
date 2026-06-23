import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";

export const runtime = "nodejs";

const VALID_REFUND_STATUSES = ["pending", "processed", "failed"] as const;

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

  const body = await request.json().catch(() => ({}));
  const { refundStatus, adminNote } = body;

  if (!VALID_REFUND_STATUSES.includes(refundStatus)) {
    return Response.json(
      { message: `refundStatus must be one of: ${VALID_REFUND_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const booking = await BookingModel.findById(id);
  if (!booking) {
    return Response.json({ message: "Booking not found." }, { status: 404 });
  }

  if (!["cancelled", "refunded"].includes(booking.status)) {
    return Response.json({ message: "Only cancelled bookings can have their refund processed." }, { status: 400 });
  }

  const update: Record<string, unknown> = { refundStatus };

  if (refundStatus === "processed") {
    update.paymentStatus = "refunded";
    update.status        = "refunded";
  }

  if (adminNote?.trim()) {
    update["metadata.note"] = adminNote.trim();
  }

  const updated = await BookingModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  )
    .populate("user", "name email")
    .populate({
      path: "bus",
      select: "date departureTime routeId",
      populate: { path: "routeId", select: "from to" },
    })
    .lean() as any;

  return Response.json({
    booking: {
      id:           String(updated._id),
      refundStatus: updated.refundStatus,
      paymentStatus:updated.paymentStatus,
      status:       updated.status,
      refundAmount: updated.refundAmount,
      updatedAt:    updated.updatedAt,
    },
  });
}
