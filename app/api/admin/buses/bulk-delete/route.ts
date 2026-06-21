import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BusModel from "@/models/Bus";
import BookingModel from "@/models/Booking";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  let ids: string[] = [];
  try {
    const body = await request.json();
    ids = Array.isArray(body.ids) ? body.ids : [];
  } catch {
    return Response.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (ids.length === 0) {
    return Response.json({ message: "No IDs provided" }, { status: 400 });
  }

  if (ids.some((id) => !isValidObjectId(id))) {
    return Response.json({ message: "One or more invalid IDs" }, { status: 400 });
  }

  if (ids.length > 100) {
    return Response.json({ message: "Maximum 100 deletions per request" }, { status: 400 });
  }

  await connectToDatabase();

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  // Check for active bookings on these buses
  const activeBookings = await BookingModel.countDocuments({
    bus: { $in: objectIds },
    status: { $in: ["pending", "confirmed"] },
  });

  if (activeBookings > 0) {
    return Response.json(
      {
        message: `Cannot delete: ${activeBookings} active booking${activeBookings !== 1 ? "s" : ""} exist on selected departures.`,
      },
      { status: 409 }
    );
  }

  const result = await BusModel.deleteMany({ _id: { $in: objectIds } });

  return Response.json({
    deleted: result.deletedCount,
    message: `${result.deletedCount} departure${result.deletedCount !== 1 ? "s" : ""} deleted.`,
  });
}
