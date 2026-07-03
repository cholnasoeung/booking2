import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import NotificationModel from "@/models/communication/Notification";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  await connectToDatabase();

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments({ userId: user.id, read: false }),
  ]);

  return Response.json({
    notifications: notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      busId: n.busId ? String(n.busId) : null,
      bookingId: n.bookingId ? String(n.bookingId) : null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Unauthorized" }, { status: 401 });

  await connectToDatabase();

  const body = await req.json().catch(() => ({}));

  if (body.action === "markAllRead") {
    const result = await NotificationModel.updateMany(
      { userId: user.id, read: false },
      { $set: { read: true } }
    );
    return Response.json({ updated: result.modifiedCount });
  }

  if (body.id) {
    const result = await NotificationModel.updateOne(
      { _id: body.id, userId: user.id },
      { $set: { read: true } }
    );
    if (result.matchedCount === 0)
      return Response.json({ message: "Notification not found" }, { status: 404 });
    return Response.json({ updated: result.modifiedCount });
  }

  return Response.json({ message: "Invalid request" }, { status: 400 });
}
