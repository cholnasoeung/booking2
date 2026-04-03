import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import WaitingListModel from "@/models/WaitingList";
import LoyaltyModel, { type LoyaltyTier } from "@/models/Loyalty";

const TIER_PRIORITY: Record<LoyaltyTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

export const runtime = "nodejs";

// GET waiting list entries for a bus (admin only)
export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const busId = searchParams.get("busId");

  if (!busId || !isValidObjectId(busId)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const waitingList = await WaitingListModel.find({
      bus: busId,
      status: "active",
    })
      .populate("user")
      .sort({ priority: -1, createdAt: 1 })
      .lean();

    return Response.json({ waitingList, count: waitingList.length });
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    return Response.json(
      { message: "Unable to fetch waiting list" },
      { status: 500 }
    );
  }
}

// POST join waiting list
export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to join waiting list" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const busId = typeof body?.busId === "string" ? body.busId : "";
    const routeId = typeof body?.routeId === "string" ? body.routeId : "";
    const requestedSeats = typeof body?.requestedSeats === "number" ? body.requestedSeats : 1;
    const requestedDate = typeof body?.date === "string" ? body.date : "";
    const requestedDepartureTime = typeof body?.departureTime === "string" ? body.departureTime : "";
    const notes = typeof body?.notes === "string" ? body.notes : "";

    if (!isValidObjectId(busId) || !isValidObjectId(routeId)) {
      return Response.json({ message: "Invalid bus or route ID" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if already on waiting list
    const existingEntry = await WaitingListModel.findOne({
      user: session.user.id,
      bus: busId,
      status: { $in: ["active", "notified"] },
    });

    if (existingEntry) {
      return Response.json(
        { message: "You are already on the waiting list for this bus" },
        { status: 400 }
      );
    }

    // Get user loyalty tier for priority
    const loyalty = await LoyaltyModel.findOne({ user: session.user.id });
    const priority = loyalty ? TIER_PRIORITY[loyalty.tier] : 1;

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const entry = await WaitingListModel.addToWaitingList({
      userId: session.user.id,
      busId,
      routeId,
      requestedSeats,
      requestedDate,
      requestedDepartureTime,
      expiresAt,
      priority,
    });

    if (notes) {
      entry.notes = notes;
      await entry.save();
    }

    return Response.json({
      message: "Added to waiting list successfully",
      entry: {
        id: entry._id,
        position: await WaitingListModel.countDocuments({
          bus: busId,
          status: "active",
          createdAt: { $lte: entry.createdAt },
        }),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error joining waiting list:", error);
    return Response.json(
      { message: "Unable to join waiting list" },
      { status: 500 }
    );
  }
}

// DELETE leave waiting list
export async function DELETE(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("id");

  if (!entryId || !isValidObjectId(entryId)) {
    return Response.json({ message: "Invalid entry ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const entry = await WaitingListModel.findById(entryId);

    if (!entry) {
      return Response.json({ message: "Waiting list entry not found" }, { status: 404 });
    }

    const isOwner = String(entry.user) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json(
        { message: "You are not authorized to remove this entry" },
        { status: 403 }
      );
    }

    entry.status = "cancelled";
    await entry.save();

    return Response.json({ message: "Removed from waiting list" });
  } catch (error) {
    console.error("Error leaving waiting list:", error);
    return Response.json(
      { message: "Unable to leave waiting list" },
      { status: 500 }
    );
  }
}
