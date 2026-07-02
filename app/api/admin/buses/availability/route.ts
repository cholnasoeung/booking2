import { getCurrentSession } from "@/lib/auth";
import { isValidDateInput, toTravelDate } from "@/lib/utils/date";
import { connectToDatabase } from "@/lib/db/mongodb";
import BusModel from "@/models/transport/Bus";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date          = searchParams.get("date") ?? "";
  const endDate       = searchParams.get("endDate") ?? "";
  const departureTime = searchParams.get("departureTime") ?? "";
  const arrivalTime   = searchParams.get("arrivalTime") ?? "";
  const excludeId     = searchParams.get("excludeId") ?? "";

  if (!date || !departureTime || !arrivalTime || !isValidDateInput(date)) {
    return Response.json({ busyBusDetailIds: [], busyDriverIds: [], conflictInfo: {} });
  }

  await connectToDatabase();

  // Bus.date is stored as a UTC Date object, e.g. 2024-07-15T00:00:00.000Z
  const startDate = toTravelDate(date);
  const useRange  = endDate && isValidDateInput(endDate) && endDate >= date;
  const endDateObj = useRange ? toTravelDate(endDate) : startDate;

  const dateFilter: Record<string, unknown> = useRange
    ? { date: { $gte: startDate, $lte: endDateObj } }
    : { date: startDate };

  const conflictFilter: Record<string, unknown> = {
    ...dateFilter,
    // Two time ranges [A_dep, A_arr] and [B_dep, B_arr] overlap when:
    // A_dep < B_arr  AND  A_arr > B_dep
    departureTime: { $lt: arrivalTime },
    arrivalTime:   { $gt: departureTime },
  };

  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    conflictFilter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  const conflicts = await BusModel.find(conflictFilter, {
    busDetailId: 1,
    driverId: 1,
    date: 1,
    departureTime: 1,
    arrivalTime: 1,
  }).lean();

  const busyBusDetailIds = [
    ...new Set(
      conflicts
        .filter((c) => c.busDetailId)
        .map((c) => String(c.busDetailId))
    ),
  ];

  const busyDriverIds = [
    ...new Set(
      conflicts
        .filter((c) => c.driverId)
        .map((c) => String(c.driverId))
    ),
  ];

  // Build a human-readable conflict map for display
  const conflictInfo: Record<string, string> = {};
  for (const c of conflicts) {
    const dateStr = c.date instanceof Date
      ? c.date.toISOString().slice(0, 10)
      : String(c.date).slice(0, 10);
    const label = `${dateStr} ${c.departureTime}–${c.arrivalTime}`;
    if (c.busDetailId) conflictInfo[String(c.busDetailId)] = label;
    if (c.driverId)    conflictInfo[String(c.driverId)]    = label;
  }

  return Response.json({ busyBusDetailIds, busyDriverIds, conflictInfo });
}
